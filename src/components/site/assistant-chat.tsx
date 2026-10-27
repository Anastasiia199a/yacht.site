import { MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { askAssistant, TELEGRAM, type ChatTurn } from "@/lib/backend";

import { LeadForm, type PlanOption } from "./lead-form";

// Quick replies from the knowledge base: four up front, the rest under "More questions".
const QUICK = ["Prices", "Services", "What documents do I need?", "Can I leave my phone number?"];
const MORE = [
  "How do I get started?",
  "Can you help me get a seafarer's passport?",
  "Do I need yacht experience?",
  "Is a job guaranteed?",
  "How does mentorship work?",
  "Seychelles or Maldives?",
  "Talk to Ilya",
];

// Built-in answers from the knowledge base: used when the AI backend is not connected or does not answer.
const FAQ: { k: RegExp; a: string; form?: boolean }[] = [
  {
    k: /talk to ilya|speak|human|person|telegram|contact ilya|reach ilya/i,
    a: `I can pass your question to Ilya. Leave your details below, or message him on Telegram: ${TELEGRAM.handle}.`,
    form: true,
  },
  {
    k: /phone|number|email|contact me|call me|leave my|sign ?up|register|enrol|book/i,
    a: "Of course. Leave your details below and choose your preferred contact method. By submitting them, you agree that Ilya may contact you about your enquiry. Please don't send passport scans in this chat.",
    form: true,
  },
  {
    k: /seafarer|seaman|passport/i,
    a: "The 3-month program includes guidance through the seafarer-document process. Issuance depends on eligibility and official procedures, so it can't be guaranteed by the program.",
  },
  {
    k: /guarantee|guaranteed/i,
    a: "No job can be guaranteed. The program provides guidance and preparation; hiring depends on your eligibility, qualifications, experience, language skills, available vacancies and employers' decisions.",
  },
  {
    k: /mentor/i,
    a: "Mentorship ($1,200) is more hands-on than a one-off consultation: personal guidance through agreed preparation steps, help with the document and application process, and support toward a possible joint trip to the Seychelles. The scope, timing and costs must be agreed with Ilya before payment.",
  },
  {
    k: /seychelles|maldives|destination|which is better/i,
    a: "Ilya has worked in both. The best route for you depends on your documents, target role, hiring opportunities and travel eligibility, so neither can be promised as a placement.",
  },
  {
    k: /document|visa|certificat|stcw|paper/i,
    a: "The exact documents depend on your nationality, intended role, vessel and the relevant authorities. Ilya can help you understand the process, but the final requirements must be checked for your situation.",
  },
  {
    k: /experience|beginner|new to|from zero|no background/i,
    a: "You can start by learning what the industry requires. Your next steps depend on your background, skills, nationality, documents and target role. Would you like to tell me a little about your experience?",
  },
  {
    k: /refund|pay|instal|invoice|card/i,
    a: "Payment methods and refund terms haven't been confirmed yet. Ilya will confirm them with you in writing before enrolment.",
  },
  {
    k: /flight|accommodation|insurance|include|expense|cost of living/i,
    a: "What's included beyond the service itself (flights, accommodation, visas, insurance) hasn't been confirmed. Ask Ilya for a written breakdown before you pay.",
  },
  {
    k: /accredit|official|recogni|certificate/i,
    a: "Accreditation details haven't been provided, so I can't say the program is officially recognised. I can pass that question to Ilya.",
  },
  {
    k: /english|language/i,
    a: "English can be important in international yacht work, but the level required depends on the role, crew and employer. Ilya can tell you what to expect for your route.",
  },
  {
    k: /start|begin|first step|get into/i,
    a: "Start by telling me whether you're completely new to yachting, already have maritime experience, or are preparing your documents. I'll point you toward the most relevant option.",
  },
  {
    k: /price|cost|how much|\$|fee|cheap|expensive/i,
    a: "Here are the three options: Personal Consultation — $500; Personal Mentorship — $1,200; 3-Month Training Program — $2,500. I can explain what each one is designed for. Some scope and expense details need to be confirmed with Ilya before payment.",
  },
  {
    k: /service|offer|option|package|program|consult/i,
    a: "Ilya helps aspiring yacht crew understand the industry, prepare for the document process and take practical steps toward yacht roles. You can choose a consultation, mentorship or a structured 3-month program.",
  },
  {
    k: /^(hi|hello|hey|good (morning|afternoon|evening))\b/i,
    a: "Hi! I can tell you about prices and services, documents, and how to get started in yachting. What would you like to know?",
  },
];

const FALLBACK =
  "I don't have a confirmed answer to that yet, and I don't want to mislead you. I can help you send the question to Ilya for confirmation.";

function builtInAnswer(text: string) {
  const hit = FAQ.find((f) => f.k.test(text));
  return hit ? { reply: hit.a, form: Boolean(hit.form) } : { reply: FALLBACK, form: false };
}

type Message = { id: number; who: "bot" | "me"; text: string } | { id: number; who: "form"; question: string };

const GREETING =
  "Hi! I'm Ilya's assistant. Ask me about prices and services, documents, or how to get started in yachting.";

export function AssistantChat({ plans }: { plans: PlanOption[] }) {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [plan, setPlan] = useState(plans[0].id);
  const [messages, setMessages] = useState<Message[]>([{ id: 0, who: "bot", text: GREETING }]);
  const history = useRef<ChatTurn[]>([]);
  const [session] = useState(() => Math.random().toString(36).slice(2) + Date.now().toString(36));
  const nextId = useRef(1);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [messages, busy]);

  const close = () => {
    setOpen(false);
    fabRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      fabRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const push = (m: { who: "bot" | "me"; text: string }) =>
    setMessages((list) => [...list, { ...m, id: nextId.current++ }]);

  const send = async (raw: string) => {
    const text = raw.trim().slice(0, 500);
    if (!text || busy) return;
    setInput("");
    push({ who: "me", text });
    setBusy(true);
    let out: { reply: string; form: boolean } | null = null;
    try {
      out = await askAssistant(text, session, history.current);
    } catch {
      out = null;
    }
    if (!out) {
      await new Promise((r) => setTimeout(r, 450));
      out = builtInAnswer(text);
    }
    history.current.push({ role: "user", text }, { role: "model", text: out.reply });
    push({ who: "bot", text: out.reply });
    // one open form at a time is enough
    if (out.form) setMessages((list) => (list.some((m) => m.who === "form") ? list : [...list, { id: nextId.current++, who: "form", question: text }]));
    setBusy(false);
    inputRef.current?.focus();
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="assistant"
        className={`btn-gold fixed right-4 bottom-4 z-40 !min-h-12 !px-4 sm:right-6 sm:bottom-6 sm:!px-5 ${open ? "invisible" : ""}`}
      >
        <MessageCircle className="size-5" strokeWidth={1.6} />
        <span className="hidden sm:inline">Ask a question</span>
        <span className="sr-only sm:hidden">Ask Ilya's assistant</span>
      </button>

      <section
        id="assistant"
        role="dialog"
        aria-label="Ilya's assistant"
        aria-hidden={!open}
        className={`fixed right-0 bottom-0 z-40 flex h-[min(640px,100svh)] w-full flex-col bg-[#071a2b] text-ink shadow-[0_24px_64px_rgb(0_0_0/0.5)] transition-[opacity,transform] duration-300 sm:right-6 sm:bottom-6 sm:h-[min(620px,calc(100svh-3rem))] sm:w-[400px] ${open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
        style={{ textShadow: "none" }}
      >
        <header className="flex items-start justify-between gap-4 bg-midnight px-5 py-4">
          <div>
            <p className="display text-xl leading-tight">Ilya's assistant</p>
            <p className="mt-1 text-[13px] text-gauge">Yachting careers, prices and first steps</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="-mr-2 grid size-10 place-items-center text-gauge transition-colors hover:text-ink"
            aria-label="Close the assistant"
          >
            <X className="size-5" strokeWidth={1.6} />
          </button>
        </header>

        <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {messages.map((m) =>
            m.who === "form" ? (
              <div key={m.id} className="bg-field/70 p-4">
                <p className="mb-3 text-[15px]">Leave your details for Ilya</p>
                <LeadForm
                  compact
                  plans={plans}
                  plan={plan}
                  onPlanChange={setPlan}
                  source="chat"
                  question={m.question}
                  submitLabel="Send to Ilya"
                />
              </div>
            ) : (
              <p
                key={m.id}
                className={`max-w-[88%] px-4 py-2.5 text-[15px] leading-snug whitespace-pre-line ${
                  m.who === "me" ? "ml-auto bg-navy" : "bg-field"
                }`}
              >
                {m.text}
              </p>
            )
          )}
          {busy && (
            <p className="flex w-16 justify-center gap-1 bg-field px-4 py-3" aria-label="Assistant is typing">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-1.5 animate-bounce rounded-full bg-gauge" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </p>
          )}
        </div>

        {/* One scrollable row, so the quick replies never crowd out the conversation. */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:thin]">
          {(more ? [...QUICK, ...MORE] : QUICK).map((q) => (
            <button
              key={q}
              type="button"
              disabled={busy}
              onClick={() => void send(q)}
              className="shrink-0 bg-field px-3 py-2 text-[13px] whitespace-nowrap text-ink/90 transition-colors hover:bg-field-hi disabled:opacity-50"
            >
              {q}
            </button>
          ))}
          {!more && (
            <button
              type="button"
              onClick={() => setMore(true)}
              className="shrink-0 px-2 py-2 text-[13px] whitespace-nowrap text-gauge underline-offset-4 hover:text-ink hover:underline"
            >
              More questions
            </button>
          )}
        </div>

        <form onSubmit={submit} className="flex gap-2 border-t border-gauge/15 px-4 py-3">
          <label htmlFor="assistant-input" className="sr-only">
            Your question
          </label>
          <input
            ref={inputRef}
            id="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            autoComplete="off"
            placeholder="Type your question…"
            className="field !min-h-11 flex-1"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="btn-gold !min-h-11 !px-4"
            aria-label="Send"
          >
            <Send className="size-4" strokeWidth={1.75} />
          </button>
        </form>
        <p className="px-4 pb-3 text-[13px] leading-snug text-gauge/80">
          AI assistant · details may need confirmation by Ilya. Please don't share passport scans here.
        </p>
      </section>
    </>
  );
}
