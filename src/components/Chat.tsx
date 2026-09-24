import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Copy, RotateCcw, Square } from "lucide-react";
import { Markdown } from "./Markdown";
import { Logo } from "./Logo";
import { SignInCard } from "./SignInCard";
import { STATUS_TEXT, SignInRequiredError, streamDemoChat, type AgentStreamEvent, type DemoInfo } from "@/lib/agent";
import { cn } from "@/lib/utils";
import { storedCredential, type GoogleUser } from "@/lib/auth";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  error?: string;
  /** The question this answer belongs to, so a failed turn can be retried. */
  question?: string;
  streaming?: boolean;
  status?: string;
}

const newId = () => Math.random().toString(36).slice(2);

/** Tallest the composer grows before it starts scrolling its own text. */
const COMPOSER_MAX_HEIGHT = 208;

/**
 * Shown when the server cannot be reached for its own list — an empty page with nothing to try is
 * the one state this page must never be in.
 */
const FALLBACK_SUGGESTIONS = [
  "Where do DAU graduates work?",
  "What were DAU's placement figures last year?",
  "What does the B.Tech programme cover?",
  "Which companies recruit from DAU?",
];

export function Chat({
  info,
  token,
  onSignedIn,
  onAnswered,
  onReset,
}: {
  info: DemoInfo | null;
  token: string | null;
  onSignedIn: (user: GoogleUser) => void;
  onAnswered: () => void;
  onReset: (reset: () => void) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [showJump, setShowJump] = useState(false);
  /** The question that ran into the sign-in wall, asked for them once they are in. */
  const pending = useRef<string | null>(null);

  const conversationId = useRef<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  /** False once the visitor scrolls up, so a streaming answer never yanks them back down. */
  const pinned = useRef(true);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const element = list.current;
    if (element) element.scrollTo({ top: element.scrollHeight, behavior });
  };

  const onListScroll = () => {
    const element = list.current;
    if (!element) return;
    const fromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    pinned.current = fromBottom < 80;
    setShowJump(fromBottom > 240);
  };

  useEffect(() => {
    if (pinned.current) scrollToBottom();
  }, [messages]);

  // The composer grows with what's typed into it, up to a ceiling, then scrolls.
  useLayoutEffect(() => {
    const element = textarea.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  }, [input]);

  const update = (id: string, change: Partial<ChatMessage> | ((m: ChatMessage) => Partial<ChatMessage>)) =>
    setMessages((previous) =>
      previous.map((m) => (m.id === id ? { ...m, ...(typeof change === "function" ? change(m) : change) } : m))
    );

  const send = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || busy) return;

      const answerId = newId();
      setMessages((previous) => [
        ...previous,
        { id: newId(), role: "USER", content: text },
        { id: answerId, role: "ASSISTANT", content: "", streaming: true, question: text },
      ]);
      setInput("");
      setBusy(true);
      setNeedsSignIn(false);
      pinned.current = true;

      const controller = new AbortController();
      abort.current = controller;

      try {
        await streamDemoChat({
          message: text,
          conversationId: conversationId.current,
          // Read at call time: a question resumed right after signing in needs the new token,
          // which the parent has not handed down yet.
          token: token ?? storedCredential()?.token ?? null,
          signal: controller.signal,
          onEvent: (event: AgentStreamEvent) => {
            switch (event.type) {
              case "META":
                conversationId.current = event.conversationId;
                break;
              case "STATUS":
                update(answerId, (m) => (m.content ? {} : { status: STATUS_TEXT[event.text] ?? "Working on it…" }));
                break;
              case "TOKEN":
                update(answerId, (m) => ({ content: m.content + event.text, status: undefined }));
                break;
              case "DONE":
                update(answerId, { streaming: false, status: undefined });
                break;
              case "ERROR":
                update(answerId, { streaming: false, status: undefined, error: event.error });
                break;
            }
          },
        });
        update(answerId, (m) => (m.streaming ? { streaming: false, status: undefined } : {}));
      } catch (e) {
        const aborted = controller.signal.aborted;
        if (e instanceof SignInRequiredError) {
          // Not a failure: they have used their free questions, so the page asks for an account.
          // The question is held back — bubbles and all — and asked again once they are in.
          pending.current = text;
          setNeedsSignIn(true);
          setMessages((previous) => previous.slice(0, -2));
        } else {
          update(answerId, (m) => ({
            streaming: false,
            status: undefined,
            error: aborted ? undefined : e instanceof Error ? e.message : "Something went wrong. Please try again.",
            content: aborted && !m.content ? "Stopped." : m.content,
          }));
        }
      } finally {
        abort.current = null;
        setBusy(false);
        onAnswered();
      }
    },
    [busy, onAnswered, token]
  );

  const retry = (message: ChatMessage) => {
    if (!message.question || busy) return;
    setMessages((previous) => previous.filter((m) => m.id !== message.id));
    void send(message.question);
  };

  // A visitor can sign in at the wall or from the header, so the held-back question is resumed off
  // the token itself rather than off whichever button they happened to use.
  useEffect(() => {
    if (!token || !pending.current) return;
    const question = pending.current;
    pending.current = null;
    setNeedsSignIn(false);
    void send(question);
  }, [token, send]);

  const stop = () => abort.current?.abort();

  useEffect(() => {
    onReset(() => {
      abort.current?.abort();
      setMessages([]);
      setInput("");
      setNeedsSignIn(false);
      conversationId.current = null;
      textarea.current?.focus();
    });
  }, [onReset]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  };

  const composerState = busy ? "is-thinking" : focused ? "is-focused" : "is-idle";
  const blocked = needsSignIn && !token;
  const remaining = info && !info.signedIn && info.remaining > 0 && messages.length > 0
    ? `${info.remaining} free ${info.remaining === 1 ? "question" : "questions"} left`
    : info?.signedIn && info.remaining <= 5
      ? `${info.remaining} left today`
      : "";

  return (
    <>
      <div className="relative min-h-0 flex-1">
        <div
          ref={list}
          onScroll={onListScroll}
          className="h-full overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-5 sm:px-8 sm:py-6"
        >
          <div
            className={cn(
              "mx-auto flex min-h-full w-full max-w-answer flex-col",
              messages.length === 0 ? "justify-center" : "gap-6 sm:gap-7"
            )}
          >
            {messages.length === 0 && !blocked ? (
              <EmptyState
                suggestions={info?.suggestions?.length ? info.suggestions : FALLBACK_SUGGESTIONS}
                onPick={(s) => void send(s)}
              />
            ) : (
              messages.map((m) => <Turn key={m.id} message={m} onRetry={retry} />)
            )}
            {blocked && <SignInCard clientId={info?.googleClientId ?? null} onSignedIn={onSignedIn} />}
          </div>
        </div>

        {showJump && (
          <button
            type="button"
            onClick={() => {
              pinned.current = true;
              setShowJump(false);
              scrollToBottom();
            }}
            className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] text-foreground shadow-lg shadow-black/40"
          >
            <ArrowDown className="h-4 w-4" />
            Latest
          </button>
        )}
      </div>

      <div
        className="shrink-0 px-4 pt-2 sm:px-8"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <div className={cn("gemini-border mx-auto w-full max-w-answer", composerState)}>
          {/* Padding clears the 24px corner radius on every side — at anything less the first line
              of text sits inside the curve and the opening character reads as clipped. */}
          <div className="gemini-inner flex flex-col gap-2 px-4 pb-3 pt-4 sm:px-6 sm:pb-3.5 sm:pt-5">
            <textarea
              ref={textarea}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={blocked}
              // The leading space is deliberate: the caret sits at position 0, and the opening
              // letter of each of these is drawn flush to that same point, so without it the cursor
              // paints through the first glyph and the word reads as clipped.
              placeholder={
                blocked
                  ? "Sign in to keep asking…"
                  : busy
                    ? "Type your next question…"
                    : "Ask about clubs, faculty, placements, alumni…"
              }
              rows={1}
              enterKeyHint="send"
              className="composer-input max-h-52 min-h-[44px] w-full resize-none bg-transparent text-[16px] leading-[1.6] text-foreground caret-primary outline-none placeholder:text-muted-foreground disabled:opacity-60 sm:min-h-[52px]"
            />
            <div className="flex items-end justify-between gap-3">
              <span className="pb-1 text-[12px] text-muted-foreground sm:text-[12.5px]">{remaining}</span>
              {busy ? (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={stop}
                  aria-label="Stop"
                  title="Stop"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-90"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  // preventDefault keeps focus in the textarea, so the phone keyboard stays up.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void send(input)}
                  disabled={!input.trim() || blocked}
                  aria-label="Send"
                  title="Send"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all active:scale-90 disabled:bg-muted disabled:text-muted-foreground"
                >
                  <ArrowUp className="h-[18px] w-[18px]" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyState({ suggestions, onPick }: { suggestions: string[]; onPick: (s: string) => void }) {
  return (
    <div className="hero-in flex flex-col items-center py-6 text-center sm:py-8">
      <Logo className="h-12 w-12 drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)] sm:h-16 sm:w-16" />
      <h2 className="mt-5 font-display text-[24px] font-semibold leading-[1.15] tracking-tight sm:text-[34px]">
        Ask anything about DAU
      </h2>
      <p className="mt-2.5 max-w-[44ch] text-[13.5px] leading-relaxed text-muted-foreground sm:mt-3 sm:text-[15px]">
        The assistant inside <span className="text-foreground">Attendance IO</span>. Ask about
        programmes, faculty, clubs, placements or alumni.
      </p>

      <div className="mt-6 grid w-full gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-2.5">
        {suggestions.slice(0, 4).map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPick(suggestion)}
            className="rounded-xl border border-border bg-surface/60 px-4 py-3 text-left text-[13.5px] leading-snug sm:py-3.5 sm:text-[14.5px] text-foreground/90 transition-colors hover:border-primary/50 hover:bg-surface hover:text-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * One turn. The question is a bubble because "this is what you asked" is worth marking; the answer
 * is not, because boxing a table of thirty alumni inside a chat bubble is what made the old page
 * feel cramped. The answer simply owns the column.
 */
function Turn({ message, onRetry }: { message: ChatMessage; onRetry: (m: ChatMessage) => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (message.role === "USER") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[14.5px] leading-relaxed text-primary-foreground sm:text-[15.5px]">
          {message.content}
        </div>
      </div>
    );
  }

  // A failed turn keeps its frame: the border is what tells you this isn't the answer.
  if (message.error && !message.content) {
    return (
      <div className="flex w-full flex-col items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/[0.07] px-4 py-3.5 text-[14.5px] leading-relaxed sm:text-[15px]">
        <span>{message.error}</span>
        {message.question && (
          <button
            type="button"
            onClick={() => onRetry(message)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] transition-colors hover:border-primary/50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="group flex w-full min-w-0 flex-col items-start">
      {message.content ? <Markdown content={message.content} /> : <Thinking status={message.status} />}
      {!message.streaming && message.content && (
        <button
          type="button"
          onClick={copy}
          className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}

function Thinking({ status }: { status?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-[14.5px] text-muted-foreground sm:text-[15px]">
      <span className="inline-flex items-end gap-1">
        <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-current" />
        <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-current" />
        <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {status ?? "Thinking…"}
    </span>
  );
}
