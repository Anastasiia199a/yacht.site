// Web app URL of apps-script/Code.gs (see apps-script/SETUP.md).
// Until it is set, the form reports that it is not connected and the assistant
// answers from its built-in replies.
export const BACKEND_URL =
  "https://script.google.com/macros/s/AKfycbzBRZas3k4Fy5-EXp_pNciE292AzG9Xt0ReNNPxtJRNtnM8NlaJBMW5V7sLd05kP1U/exec";

export const TELEGRAM = { handle: "@anestezia7", url: "https://t.me/anestezia7" };

export const isBackendConnected = () => BACKEND_URL.startsWith("https://");

export interface LeadInput {
  name: string;
  email: string;
  contact: string;
  plan: string;
  consent: boolean;
  source: "form" | "chat";
  question?: string;
  /** Honeypot: real visitors leave it empty. */
  website?: string;
}

// A plain form-encoded POST is a "simple" request, so Apps Script answers it without a CORS preflight.
async function post(params: Record<string, string>): Promise<{ ok: boolean; error?: string; [k: string]: unknown }> {
  const res = await fetch(BACKEND_URL, { method: "POST", body: new URLSearchParams(params) });
  return res.json();
}

export async function sendLead(lead: LeadInput): Promise<void> {
  if (!isBackendConnected()) throw new Error("not-connected");
  const json = await post({
    action: "lead",
    name: lead.name,
    email: lead.email,
    contact: lead.contact,
    plan: lead.plan,
    consent: lead.consent ? "yes" : "",
    source: lead.source,
    question: lead.question ?? "",
    website: lead.website ?? "",
    page: location.href,
  });
  if (!json.ok) throw new Error(json.error || "Request failed");
}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

/** Returns null when the AI backend is not connected or does not answer. */
export async function askAssistant(
  message: string,
  session: string,
  history: ChatTurn[]
): Promise<{ reply: string; form: boolean } | null> {
  if (!isBackendConnected()) return null;
  const json = await post({
    action: "chat",
    message,
    session,
    history: JSON.stringify(history.slice(-10)),
  });
  return json.ok && typeof json.reply === "string" ? { reply: json.reply, form: Boolean(json.form) } : null;
}
