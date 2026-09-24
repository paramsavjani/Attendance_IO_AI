import { useEffect, useRef, useState } from "react";
import { initGoogleSignIn, type GoogleUser } from "@/lib/auth";

/**
 * Google's own rendered button. Theirs, because only their button may carry their name — which is
 * also why this is a slot we hand to their script rather than markup of our own.
 */
export function GoogleButton({
  clientId,
  onSignedIn,
  unavailableText = "Sign-in isn't configured yet.",
}: {
  clientId: string | null;
  onSignedIn: (user: GoogleUser) => void;
  unavailableText?: string;
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

  if (!clientId) {
    return <p className="text-[13.5px] leading-relaxed text-muted-foreground">{unavailableText}</p>;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={slot} className="flex min-h-[44px] items-center justify-center" />
      {failed && (
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Google's sign-in couldn't load — an ad blocker or a strict privacy setting usually causes that.
        </p>
      )}
    </div>
  );
}
