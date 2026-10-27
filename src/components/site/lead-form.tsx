import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { sendLead, TELEGRAM } from "@/lib/backend";

export interface PlanOption {
  id: string;
  label: string;
}

interface LeadFormProps {
  plans: PlanOption[];
  plan: string;
  onPlanChange: (id: string) => void;
  source: "form" | "chat";
  /** Last question asked in the chat, saved with the lead. */
  question?: string;
  submitLabel?: string;
  compact?: boolean;
}

type Status = "idle" | "sending" | "sent" | "error" | "offline";

/** Name, email, optional phone/Telegram, plan and consent; goes to Google Sheets via Apps Script. */
export function LeadForm({
  plans,
  plan,
  onPlanChange,
  source,
  question,
  submitLabel = "Get me on board",
  compact = false,
}: LeadFormProps) {
  const id = useId();
  const [status, setStatus] = useState<Status>("idle");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const v = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).value.trim();
    setStatus("sending");
    try {
      await sendLead({
        name: v("name"),
        email: v("email"),
        contact: v("contact"),
        plan: plans.find((p) => p.id === plan)?.label ?? "",
        consent: (form.elements.namedItem("consent") as HTMLInputElement).checked,
        source,
        question,
        website: v("website"),
      });
      form.reset();
      setStatus("sent");
    } catch (err) {
      setStatus(err instanceof Error && err.message === "not-connected" ? "offline" : "error");
    }
  };

  // Typing again after a successful send turns the green button back into a send button.
  const onInput = () => {
    if (status === "sent" || status === "error" || status === "offline") setStatus("idle");
  };

  const sent = status === "sent";
  const field = compact ? "field !min-h-11 !text-[15px]" : "field";

  return (
    <form onSubmit={submit} onInput={onInput} noValidate className="grid gap-3 text-left">
      <label className="sr-only" htmlFor={`${id}-name`}>Name</label>
      <input id={`${id}-name`} name="name" required autoComplete="name" placeholder="Name" className={field} />
      <label className="sr-only" htmlFor={`${id}-email`}>Email</label>
      <input
        id={`${id}-email`}
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="Email"
        className={field}
      />
      <label className="sr-only" htmlFor={`${id}-contact`}>Phone or Telegram (optional)</label>
      <input
        id={`${id}-contact`}
        name="contact"
        autoComplete="tel"
        placeholder="Phone or Telegram (optional)"
        className={field}
      />
      <label className="sr-only" htmlFor={`${id}-plan`}>Format</label>
      <div className="relative">
        <select
          id={`${id}-plan`}
          name="plan"
          value={plan}
          onChange={(e) => onPlanChange(e.target.value)}
          className={`${field} appearance-none pr-12`}
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id} className="bg-deep">
              {p.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          strokeWidth={1.5}
          className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-gauge"
        />
      </div>

      {/* Honeypot for bots: hidden from people and screen readers. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

      <label className={`flex items-start gap-3 ${compact ? "text-[13px]" : "text-sm"} leading-snug text-ink/85`}>
        <input name="consent" type="checkbox" required className="mt-0.5 size-4 shrink-0 accent-[#1f8f4e]" />
        I agree that Ilya Belov may contact me about this enquiry using the details I provided.
      </label>

      <button
        type="submit"
        disabled={status === "sending" || sent}
        className={`btn-gold mt-1 w-full ${sent ? "is-sent" : ""}`}
      >
        {sent ? (
          <>
            Thank you for registering!
            <Check className="size-4" strokeWidth={2} />
          </>
        ) : status === "sending" ? (
          "Sending…"
        ) : (
          <>
            {submitLabel}
            <ArrowRight className="nudge-right size-4" strokeWidth={1.75} />
          </>
        )}
      </button>

      <p role="status" aria-live="polite" className={`min-h-[1.25rem] ${compact ? "text-[13px]" : "text-sm"} leading-snug`}>
        {sent && <span className="text-[#6fd39b]">We've emailed you a copy of your request.</span>}
        {status === "error" && <span className="text-[#f2a3a3]">Something went wrong. Please try again in a minute.</span>}
        {status === "offline" && (
          <span className="text-[#f2a3a3]">
            The form isn't connected yet. Please message Ilya on Telegram:{" "}
            <a className="underline" href={TELEGRAM.url} target="_blank" rel="noreferrer">
              {TELEGRAM.handle}
            </a>
          </span>
        )}
      </p>
    </form>
  );
}
