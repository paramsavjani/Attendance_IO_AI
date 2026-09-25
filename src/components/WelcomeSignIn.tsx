import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Logo } from "./Logo";
import { GoogleButton } from "./GoogleButton";
import type { GoogleUser } from "@/lib/auth";

/**
 * The one thing a first-time visitor sees before the page: a sign-in card, offered rather than
 * imposed. It is a modal because signing in first is worth asking for — a bigger daily allowance,
 * and their thread survives a reload — and it closes on the X, on Escape, or on a click outside,
 * because the demo is meant to be usable without an account. Once closed it stays closed for that
 * browser, so nobody is asked twice.
 */
export function WelcomeSignIn({
  clientId,
  freeQuestions,
  signedInLimit,
  onSignedIn,
  onClose,
}: {
  clientId: string | null;
  freeQuestions?: number;
  signedInLimit?: number;
  onSignedIn: (user: GoogleUser) => void;
  onClose: () => void;
}) {
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Focus moves into the card itself rather than onto a control inside it: Escape and Tab then
    // land where a visitor expects, without a focus ring drawn around a button nobody pressed.
    card.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (!card.current?.contains(event.target as Node)) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-signin-title"
        tabIndex={-1}
        className="hero-in relative w-full max-w-sm outline-none rounded-2xl border border-border bg-surface px-6 py-7 text-center shadow-2xl shadow-black/70"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center">
          <Logo className="mb-4 h-14 w-14 drop-shadow-[0_3px_10px_rgba(0,0,0,0.5)]" />
          <h2 id="welcome-signin-title" className="font-display text-[19px] font-semibold tracking-tight">
            Welcome to Attendance IO AI
          </h2>
          <p className="mb-5 mt-2.5 text-[13.5px] leading-relaxed text-muted-foreground">
            {typeof signedInLimit === "number"
              ? `Sign in for ${signedInLimit} questions a day about DAU — programmes, faculty, clubs, placements and alumni.`
              : "Sign in for a full day's worth of questions about DAU — programmes, faculty, clubs, placements and alumni."}
          </p>
          <GoogleButton
            clientId={clientId}
            onSignedIn={onSignedIn}
            unavailableText="Sign-in isn't configured yet — the demo works without it."
          />
          <button
            type="button"
            onClick={onClose}
            className="mt-4 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {freeQuestions ? `Maybe later — ask ${freeQuestions} free questions` : "Maybe later"}
          </button>
        </div>
      </div>
    </div>
  );
}
