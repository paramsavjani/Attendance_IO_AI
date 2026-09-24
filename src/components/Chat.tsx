import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Copy, RotateCcw, Square } from "lucide-react";
import { Markdown } from "./Markdown";
import { Logo } from "./Logo";
import { SignInCard } from "./SignInCard";
import { STATUS_TEXT, SignInRequiredError, streamDemoChat, type AgentStreamEvent, type DemoInfo } from "@/lib/agent";
import { cn } from "@/lib/utils";
import { storedCredential, type GoogleUser } from "@/lib/auth";
import { CONTENT_WIDTH } from "@/App";

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

  return (
    <>
      <div className="relative min-h-0 flex-1">
        <div
          ref={list}
          onScroll={onListScroll}
          className="h-full overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4"
        >
          <div
            className={cn(
              "mx-auto flex min-h-full w-full flex-col",
              messages.length === 0 ? "justify-center" : "justify-end gap-3"
            )}
          >
            <div className={cn(CONTENT_WIDTH, "mx-auto flex w-full flex-col gap-3")}>
              {messages.length === 0 && !blocked ? (
                <EmptyState
                  suggestions={info?.suggestions?.length ? info.suggestions : FALLBACK_SUGGESTIONS}
                  onPick={(s) => void send(s)}
                />
              ) : (
                messages.map((m) => <Bubble key={m.id} message={m} onRetry={retry} />)
              )}
              {blocked && (
                <SignInCard
                  clientId={info?.googleClientId ?? null}
                  onSignedIn={(user) => {
                    onSignedIn(user);
                    setNeedsSignIn(false);
                    const question = pending.current;
                    pending.current = null;
                    if (question) void send(question);
                  }}
                />
              )}
            </div>
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
            className="liquid-nav absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-foreground"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Latest
          </button>
        )}
      </div>

      <div className="shrink-0 px-3 pt-2" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
        <div className={cn("gemini-border mx-auto", CONTENT_WIDTH, composerState)}>
          <div className="gemini-inner flex flex-col px-3.5 pb-2 pt-3">
            <textarea
              ref={textarea}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={blocked}
              placeholder={
                blocked
                  ? "Sign in to keep asking…"
                  : busy
                    ? "Type your next question…"
                    : "Ask about clubs, faculty, placements, alumni…"
              }
              rows={1}
              enterKeyHint="send"
              className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
            />
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                {info && !info.signedIn && info.remaining > 0 && messages.length > 0
                  ? `${info.remaining} free ${info.remaining === 1 ? "question" : "questions"} left`
                  : info?.signedIn && info.remaining <= 5
                    ? `${info.remaining} left today`
                    : ""}
              </span>
              {busy ? (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={stop}
                  aria-label="Stop"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background active:scale-90"
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
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity active:scale-90 disabled:opacity-40"
                >
                  <ArrowUp className="h-4 w-4" />
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
    <div className="flex flex-col items-center px-1 pb-2 pt-6 text-center">
      <Logo className="mb-4 h-16 w-16 drop-shadow-[0_4px_14px_rgba(0,0,0,0.55)]" />
      <h2 className="text-[18px] font-semibold">Ask anything about DAU</h2>
      <p className="mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-muted-foreground">
        Built into <span className="text-foreground">Attendance IO</span> — programmes, faculty, clubs,
        placements, alumni and campus life. Ask it like you'd ask a senior.
      </p>
      <div className="mt-5 flex w-full max-w-sm flex-col gap-2">
        {suggestions.slice(0, 4).map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPick(suggestion)}
            className="rounded-2xl border border-border bg-card px-3.5 py-2.5 text-left text-[13px] text-foreground/90 transition-colors hover:border-primary/40 active:scale-[0.99]"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function Bubble({ message, onRetry }: { message: ChatMessage; onRetry: (m: ChatMessage) => void }) {
  const isUser = message.role === "USER";
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

  // A failed turn is its own bubble with a retry, not a stray label under an empty one.
  if (!isUser && message.error && !message.content) {
    return (
      <div className="flex justify-start">
        <div className="flex max-w-[88%] flex-col gap-2 rounded-2xl rounded-tl-sm border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm leading-relaxed">
          <span>{message.error}</span>
          {message.question && (
            <button
              type="button"
              onClick={() => onRetry(message)}
              className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              Try again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      {/* min-w-0 lets a wide table scroll inside the bubble instead of stretching past the screen */}
      <div className={cn("group flex min-w-0 flex-col gap-1", isUser ? "max-w-[88%] items-end" : "max-w-full items-start")}>
        <div
          className={cn(
            "min-w-0 max-w-full rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
            isUser
              ? "whitespace-pre-wrap rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm border border-border bg-card text-foreground"
          )}
        >
          {isUser ? (
            message.content
          ) : message.content ? (
            <Markdown content={message.content} />
          ) : (
            <Thinking status={message.status} />
          )}
        </div>
        {!isUser && !message.streaming && message.content && (
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 px-1 text-[11px] text-muted-foreground transition-opacity hover:text-foreground"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}

function Thinking({ status }: { status?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-muted-foreground">
      <span className="inline-flex items-end gap-0.5">
        <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-current" />
        <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-current" />
        <span className="typing-dot inline-block h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {status ?? "Thinking…"}
    </span>
  );
}
