import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { GoogleButton } from "./GoogleButton";
import { GoogleTrigger } from "./GoogleTrigger";
import type { GoogleUser } from "@/lib/auth";

/**
 * The account control in the header, in both states.
 *
 * Signed out it is a plain "Sign in" button, so signing in is available from the first second
 * rather than only once the free questions run out. Signed in it opens the panel a visitor expects
 * when they click their own face — who they are, what's left today — with signing out as a
 * deliberate second click instead of something that happens the instant they touch the avatar.
 */
export function AccountMenu({
  user,
  clientId,
  remaining,
  dailyLimit,
  onSignedIn,
  onSignOut,
}: {
  user: GoogleUser | null;
  clientId: string | null;
  remaining?: number;
  dailyLimit?: number;
  onSignedIn: (user: GoogleUser) => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Signing in closes the panel on its own — the header swaps to the account state underneath.
  const handleSignedIn = (signedIn: GoogleUser) => {
    setOpen(false);
    onSignedIn(signedIn);
  };

  return (
    <div ref={wrap} className="relative shrink-0">
      {user ? (
        <button
          type="button"
          onClick={() => setOpen((was) => !was)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Your account"
          className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-border transition-all hover:ring-2 hover:ring-primary/60"
        >
          {user.picture ? (
            <img src={user.picture} alt="" className="h-full w-full rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span className="grid h-full w-full place-items-center rounded-full bg-muted text-[12px] font-medium">
              {(user.name ?? "?").slice(0, 1).toUpperCase()}
            </span>
          )}
        </button>
      ) : (
        <GoogleTrigger clientId={clientId} onSignedIn={handleSignedIn} onUnavailable={() => setOpen(true)}>
          <span className="inline-flex h-9 items-center rounded-full border border-border bg-surface/50 px-3.5 text-[13.5px] font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-surface sm:px-4">
            Sign in
          </span>
        </GoogleTrigger>
      )}

      {open && (
        <div
          role={user ? "menu" : "dialog"}
          className="hero-in absolute right-0 top-[calc(100%+8px)] z-50 w-[248px] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-black/60"
        >
          {user ? (
            <>
              <div className="flex items-center gap-3 px-4 py-3.5">
                {user.picture ? (
                  <img src={user.picture} alt="" className="h-10 w-10 shrink-0 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-[14px] font-medium">
                    {(user.name ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  {user.name && <p className="truncate text-[14px] font-medium leading-tight">{user.name}</p>}
                  {user.email && (
                    <p className="mt-0.5 truncate text-[12px] leading-tight text-muted-foreground">{user.email}</p>
                  )}
                </div>
              </div>

              {typeof remaining === "number" && typeof dailyLimit === "number" && (
                <p className="border-t border-border px-4 py-2.5 text-[12.5px] text-muted-foreground">
                  {remaining} of {dailyLimit} questions left today
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="flex w-full items-center gap-2.5 border-t border-border px-4 py-3 text-left text-[13.5px] text-foreground transition-colors hover:bg-muted"
              >
                <LogOut className="h-4 w-4 text-muted-foreground" />
                Sign out
              </button>
            </>
          ) : (
            // Only reached when Google's script never loaded — the button above goes straight to
            // their chooser whenever it did.
            <div className="flex flex-col items-center gap-3 px-4 py-4 text-center">
              <GoogleButton
                clientId={clientId}
                onSignedIn={handleSignedIn}
                unavailableText="Sign-in isn't available right now. An ad blocker or a strict privacy setting usually causes that."
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
