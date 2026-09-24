/**
 * Client for the public demo assistant (`/api/public/agent`).
 *
 * The same Server-Sent Events stream the app uses, minus the sign-in: nobody has a token here, the
 * server identifies a visitor only well enough to keep their thread and their daily allowance
 * separate. Streaming arrives over a POST, which `EventSource` cannot do, so the body is read with
 * `fetch` and the events are parsed by hand.
 */

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "https://api.attendanceio.paramsavjani.in"}/api/public/agent`;

export interface AgentToolCall {
  name: string;
  durationMs: number;
  error?: string | null;
}

interface EventBase {
  conversationId: string;
  turnId: string;
}

export type AgentStreamEvent =
  | (EventBase & { type: "META" })
  | (EventBase & { type: "TOKEN"; text: string })
  /** The assistant started a tool; `text` is its name. Shown as "Looking up clubs…". */
  | (EventBase & { type: "STATUS"; text: string })
  | (EventBase & { type: "DONE"; toolCalls: AgentToolCall[]; latencyMs: number })
  | (EventBase & { type: "ERROR"; error: string });

export interface DemoInfo {
  signedIn: boolean;
  name: string | null;
  /** Questions this visitor has left today. Asking for it does not use one up. */
  remaining: number;
  limit: number;
  signedInLimit: number;
  askedToday: number;
  dailyLimit: number;
  /** Null when sign-in is not configured; the page then stays anonymous-only. */
  googleClientId: string | null;
  suggestions: string[];
}

/** The visitor's Google ID token, when they have signed in. Verified on the server. */
function authHeaders(token?: string | null): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchDemoInfo(token?: string | null, signal?: AbortSignal): Promise<DemoInfo | null> {
  try {
    const response = await fetch(`${BASE}/info`, { signal, headers: authHeaders(token) });
    if (!response.ok) return null;
    return (await response.json()) as DemoInfo;
  } catch {
    return null;
  }
}

function parseSseBlock(block: string): AgentStreamEvent | null {
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data) return null;
  try {
    return JSON.parse(data) as AgentStreamEvent;
  } catch {
    return null;
  }
}

export interface StreamOptions {
  message: string;
  /** Omit on the first question; the META event carries the id to send next time. */
  conversationId?: string | null;
  /** Google ID token, when signed in — it buys a larger daily allowance. */
  token?: string | null;
  onEvent: (event: AgentStreamEvent) => void;
  signal?: AbortSignal;
}

/** Thrown when the visitor is out of free questions and signing in would give them more. */
export class SignInRequiredError extends Error {}

/** Opens the stream and resolves once the server has sent DONE/ERROR or closed the connection. */
export async function streamDemoChat({ message, conversationId, token, onEvent, signal }: StreamOptions): Promise<void> {
  const response = await fetch(`${BASE}/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // JSON too, so a refusal before the stream starts (the daily cap, HTTP 429) can carry a message.
      Accept: "text/event-stream, application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ message, conversationId: conversationId ?? undefined }),
    signal,
  });

  if (!response.ok || !response.body) {
    let detail = `Something went wrong (${response.status}).`;
    try {
      const body = await response.json();
      detail = body?.message || body?.error || detail;
    } catch {
      /* non-JSON error body */
    }
    // 429 without a token means the free questions are used up, not that the day is over.
    if (response.status === 429 && !token) throw new SignInRequiredError(detail);
    throw new Error(detail);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Events are separated by a blank line; a trailing partial event stays in the buffer.
    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      const event = parseSseBlock(buffer.slice(0, separator));
      buffer = buffer.slice(separator + 2);
      if (event) onEvent(event);
      separator = buffer.indexOf("\n\n");
    }
  }

  const trailing = parseSseBlock(buffer);
  if (trailing) onEvent(trailing);
}

/** Human wording for the tool names that arrive in STATUS events. */
export const STATUS_TEXT: Record<string, string> = {
  find_clubs: "Looking through the clubs…",
  get_club: "Opening the club…",
  find_club_member: "Checking who runs it…",
  get_campus_events: "Checking what's on…",
  find_faculty: "Searching the faculty…",
  get_faculty: "Reading the profile…",
  get_institute_calendar: "Reading the academic calendar…",
  get_placement_stats: "Pulling placement figures…",
  list_placement_recruiters: "Listing recruiters…",
  get_holidays: "Checking the holidays…",
  find_staff_contacts: "Finding the right office…",
  list_programmes: "Listing programmes…",
  get_curriculum: "Reading the curriculum…",
  find_institute_committees: "Looking up committees…",
  find_scholarships: "Checking scholarships…",
  get_placement_events: "Checking placement events…",
  find_campus_services: "Looking around campus…",
  list_semesters: "Checking the semesters…",
  list_subjects: "Going through the subjects…",
  get_subject_schedule: "Reading the timetable…",
  get_academic_calendar: "Checking the calendar…",
  search_alumni: "Searching the alumni directory…",
  list_alumni_companies: "Counting alumni by company…",
};
