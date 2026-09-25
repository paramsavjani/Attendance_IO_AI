import { useEffect, useRef } from "react";
import { SignInCard } from "./SignInCard";
import type { GoogleUser } from "@/lib/auth";

/**
 * The first thing a first-time visitor sees: the same sign-in card the thread shows once the free
 * questions run out, floated over the page and given a way out. It closes on the X, on Escape or
 * on a click outside, because the demo is meant to be usable without an account, and once closed
 * it stays closed for that browser, so nobody is asked twice.
 */
export function WelcomeSignIn({
  clientId,
  onSignedIn,
  onClose,
}: {
  clientId: string | null;
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
        aria-label="Sign in"
        tabIndex={-1}
        className="w-full max-w-sm outline-none"
      >
        <SignInCard
          clientId={clientId}
          title="Sign in and ask anything about DAU"
          onSignedIn={onSignedIn}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
