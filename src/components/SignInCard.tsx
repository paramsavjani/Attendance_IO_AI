import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { initGoogleSignIn, type GoogleUser } from "@/lib/auth";

/**
 * Shown when a visitor has used their free questions. Google's own button, because only Google's
 * button may carry Google's name — and one line about why the wall exists at all, since "sign in to
 * continue" with no reason reads like a growth tactic rather than what it is.
 */
export function SignInCard({
  clientId,
  limit,
  question,
  onSignedIn,
}: {
  clientId: string | null;
  limit: number;
  /** What they were asking when they hit the wall; asked for them once they are in. */
  question?: string | null;
  onSignedIn: (user: GoogleUser) => void;
}) {
  const slot = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    void initGoogleSignIn(clientId, onSignedIn).then((handles) => {
      if (cancelled) return;
      if (!handles || !slot.current) {
        setFailed(true);
        return;
      }
      handles.renderButton(slot.current);
    });
    return () => {
      cancelled = true;
    };
  }, [clientId, onSignedIn]);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center rounded-2xl border border-border bg-card px-5 py-6 text-center">
      <Logo className="mb-3 h-14 w-14 drop-shadow-[0_3px_10px_rgba(0,0,0,0.5)]" />
      <h2 className="text-[16px] font-semibold">Sign in to keep asking</h2>
      {question && (
        <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-[13px] leading-snug text-foreground/90">
          “{question}”
          <span className="mt-1 block text-[11.5px] text-muted-foreground">Asked as soon as you're in.</span>
        </p>
      )}
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
        A Google account gets you {limit} questions a day, free.
      </p>

      {clientId ? (
        <div ref={slot} className="mt-4 flex min-h-[44px] items-center justify-center" />
      ) : (
        <p className="mt-4 text-[13px] text-muted-foreground">
          Sign-in isn't configured yet. Come back tomorrow for a fresh set of questions.
        </p>
      )}
      {failed && (
        <p className="mt-3 text-[12px] text-muted-foreground">
          Google's sign-in couldn't load — an ad blocker or a strict privacy setting usually causes that.
        </p>
      )}
    </div>
  );
}
