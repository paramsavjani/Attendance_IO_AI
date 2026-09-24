import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { initGoogleSignIn, type GoogleUser } from "@/lib/auth";

/**
 * Shown when a visitor has used their free questions. Google's own button, because only Google's
 * button may carry Google's name.
 */
export function SignInCard({
  clientId,
  onSignedIn,
}: {
  clientId: string | null;
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
      <h2 className="text-[16px] font-semibold">Sign in again to keep asking</h2>

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
