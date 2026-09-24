import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Copy, RotateCcw, Square } from "lucide-react";
import { Markdown } from "./Markdown";
import { Spark } from "./Spark";
import { STATUS_TEXT, streamDemoChat, type AgentStreamEvent } from "@/lib/agent";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  /** Set when the turn failed; rendered in place of the answer, with a retry. */
  error?: string;
  /** The question this answer belongs to, so "try again" can resend it. */
  question?: string;
  streaming?: boolean;
  /** What the assistant is doing while nothing has streamed yet. */
  status?: string;
  seconds?: number;
}

const newId = () => Math.random().toString(36).slice(2);

export function Chat({
  suggestions,
  onFirstMessage,
}: {
  suggestions: string[];
  onFirstMessage: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const conversationId = useRef<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  /** False once the visitor scrolls up, so an answer never yanks the page back down. */
  const stickToBottom = useRef(true);

  useEffect(() => {
    const onScroll = () => {
      const fromBottom = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
      stickToBottom.current = fromBottom < 120;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (stickToBottom.current) bottom.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const patch = (id: string, change: Partial<ChatMessage>) =>
    setMessages((previous) => previous.map((m) => (m.id === id ? { ...m, ...change } : m)));

  const ask = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || busy) return;

      if (messages.length === 0) onFirstMessage();
      const answerId = newId();
      setMessages((previous) => [
        ...previous,
        { id: newId(), role: "USER", content: text },
        { id: answerId, role: "ASSISTANT", content: "", streaming: true, question: text },
      ]);
      setInput("");
      setBusy(true);
      stickToBottom.current = true;

      const controller = new AbortController();
      abort.current = controller;
      const startedAt = Date.now();

      try {
        await streamDemoChat({
          message: text,
          conversationId: conversationId.current,
          signal: controller.signal,
          onEvent: (event: AgentStreamEvent) => {
            switch (event.type) {
              case "META":
                conversationId.current = event.conversationId;
                break;
              case "STATUS":
                patch(answerId, { status: STATUS_TEXT[event.text] ?? "Looking that up…" });
                break;
              case "TOKEN":
                setMessages((previous) =>
                  previous.map((m) =>
                    m.id === answerId ? { ...m, content: m.content + event.text, status: undefined } : m
                  )
                );
                break;
              case "DONE":
                patch(answerId, {
                  streaming: false,
                  status: undefined,
                  seconds: Math.round((Date.now() - startedAt) / 100) / 10,
                });
                break;
              case "ERROR":
                patch(answerId, { streaming: false, status: undefined, error: event.error });
                break;
            }
          },
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Something went wrong.";
        // An aborted stream is the visitor pressing stop, not a failure.
        if (controller.signal.aborted) patch(answerId, { streaming: false, status: undefined });
        else patch(answerId, { streaming: false, status: undefined, error: message });
      } finally {
        setMessages((previous) => previous.map((m) => (m.id === answerId ? { ...m, streaming: false } : m)));
        setBusy(false);
        abort.current = null;
      }
    },
    [busy, messages.length, onFirstMessage]
  );

  const stop = () => abort.current?.abort();

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void ask(input);
    }
  };

  const grow = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 168)}px`;
  };

  return (
    <>
      {messages.length === 0 ? (
        <Suggestions suggestions={suggestions} onPick={(s) => void ask(s)} />
      ) : (
        <div className="space-y-6 pb-4">
          {messages.map((message) =>
            message.role === "USER" ? (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-[85%] animate-fade-up whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary/15 px-4 py-2.5 text-[15px] leading-relaxed ring-1 ring-primary/25">
                  {message.content}
                </p>
              </div>
            ) : (
              <Answer key={message.id} message={message} onRetry={() => void ask(message.question ?? "")} />
            )
          )}
          <div ref={bottom} />
        </div>
      )}

      <div className="safe-bottom sticky bottom-0 z-10 bg-gradient-to-t from-background via-background to-background/80 pt-3 backdrop-blur">
        <div
          className={cn(
            "flex items-end gap-2 rounded-3xl border border-border bg-card p-2 pl-4 transition-colors",
            "focus-within:border-primary/50"
          )}
        >
          <textarea
            ref={textarea}
            value={input}
            rows={1}
            onChange={(event) => {
              setInput(event.target.value);
              grow(event.target);
            }}
            onKeyDown={onKeyDown}
            placeholder="Ask about clubs, faculty, placements, alumni…"
            className="max-h-42 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => (busy ? stop() : void ask(input))}
            disabled={!busy && !input.trim()}
            aria-label={busy ? "Stop" : "Send"}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
          >
            {busy ? <Square className="h-4 w-4" fill="currentColor" /> : <ArrowUp className="h-5 w-5" />}
          </button>
        </div>
        <p className="px-1 pb-2 pt-2 text-center text-[11px] leading-snug text-muted-foreground">
          Institute information only — no student's attendance is reachable here. The assistant can be
          wrong; double-check anything that matters.
        </p>
      </div>
    </>
  );
}

function Suggestions({ suggestions, onPick }: { suggestions: string[]; onPick: (s: string) => void }) {
  return (
    <div className="grid gap-2 pb-6 sm:grid-cols-2">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onPick(suggestion)}
          className="group rounded-2xl border border-border bg-card/60 px-4 py-3 text-left text-[14px] text-foreground/90 transition-colors hover:border-primary/40 hover:bg-card"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}

function Answer({ message, onRetry }: { message: ChatMessage; onRetry: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; nothing useful to say about it */
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="flex gap-3">
        <div className="mt-0.5 h-6 w-6 shrink-0 text-primary">
          <Spark className={message.streaming ? "animate-blink" : undefined} />
        </div>
        <div className="min-w-0 flex-1">
          {message.error ? (
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-[14px]">
              <p className="text-foreground/90">{message.error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:opacity-80"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Try again
              </button>
            </div>
          ) : message.content ? (
            <Markdown content={message.content} />
          ) : (
            <p className="py-1 text-[14px] text-muted-foreground">
              {message.status ?? "Thinking…"}
            </p>
          )}

          {!message.streaming && !message.error && message.content && (
            <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
              <button type="button" onClick={copy} className="inline-flex items-center gap-1 hover:text-foreground">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              {message.seconds !== undefined && <span>answered in {message.seconds}s</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
