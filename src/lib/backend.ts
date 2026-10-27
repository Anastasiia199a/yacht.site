// Web app URL of apps-script/Code.gs (see apps-script/SETUP.md).
// Until it is set, the form reports that it is not connected and the assistant
// answers from its built-in replies.
export const BACKEND_URL =
  "https://script.google.com/macros/s/AKfycbzMgYcAVQoWS_FUykSsjZhePoXIpteWjzKOYtFZmnCC243OpbRKEAthpDDXDyAmhUqa/exec";

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
async function post(
  params: Record<string, string>,
  signal?: AbortSignal
): Promise<{ ok: boolean; error?: string; [k: string]: unknown }> {
  const res = await fetch(BACKEND_URL, { method: "POST", body: new URLSearchParams(params), signal });
  return res.json();
}

// When Gemini is overloaded it can take minutes to give up; a visitor gets the built-in answer instead.
const ASSISTANT_TIMEOUT_MS = 15000;

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

/** Returns null when the AI backend is not connected, fails or takes longer than the timeout. */
export async function askAssistant(
  message: string,
  session: string,
  history: ChatTurn[]
): Promise<{ reply: string; form: boolean } | null> {
  if (!isBackendConnected()) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASSISTANT_TIMEOUT_MS);
  try {
    const json = await post(
      { action: "chat", message, session, history: JSON.stringify(history.slice(-10)) },
      controller.signal
    );
    return json.ok && typeof json.reply === "string" ? { reply: json.reply, form: Boolean(json.form) } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
