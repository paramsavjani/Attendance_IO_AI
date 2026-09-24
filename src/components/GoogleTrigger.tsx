import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { initGoogleSignIn, type GoogleUser } from "@/lib/auth";

/**
 * Our button, Google's click. Google's account chooser only opens from a genuine press on their own
 * rendered element, so theirs is laid over ours at zero opacity and takes the click — one tap goes
 * straight to the chooser instead of opening a menu that asks a second time.
 *
 * If their script never loads (ad blocker, strict privacy mode) the overlay stays inert and the
 * click falls through to [onUnavailable], so the button is never a dead end.
 */
export function GoogleTrigger({
  clientId,
  onSignedIn,
  onUnavailable,
  className,
  children,
}: {
  clientId: string | null;
  onSignedIn: (user: GoogleUser) => void;
  onUnavailable: () => void;
  className?: string;
  children: ReactNode;
}) {
  const slot = useRef<HTMLSpanElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    void initGoogleSignIn(clientId, onSignedIn).then((handles) => {
      if (cancelled || !handles || !slot.current) return;
      // A wide standard button gives a generous hit target; the CSS above stretches it to ours.
      handles.renderButton(slot.current, { type: "standard", text: "signin", width: 200 });
      setLive(true);
    });
    return () => {
      cancelled = true;
    };
  }, [clientId, onSignedIn]);

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <button type="button" onClick={live ? undefined : onUnavailable} className="contents">
        {children}
      </button>
      <span
        ref={slot}
        aria-hidden
        className={cn("google-overlay", live ? "pointer-events-auto" : "pointer-events-none")}
      />
    </span>
  );
}
