import { X } from "lucide-react";
import { Logo } from "./Logo";
import { GoogleButton } from "./GoogleButton";
import type { GoogleUser } from "@/lib/auth";

/**
 * The page's one sign-in card, in both places it appears: in the thread once a visitor has used
 * their free questions, and inside the welcome modal on a first visit. Same card either way — only
 * the heading changes, and the modal adds a close button.
 */
export function SignInCard({
  clientId,
  title = "Sign in again to keep asking",
  onSignedIn,
  onClose,
}: {
  clientId: string | null;
  title?: string;
  onSignedIn: (user: GoogleUser) => void;
  onClose?: () => void;
}) {
  return (
    <div className="hero-in relative mx-auto flex w-full max-w-sm flex-col items-center rounded-2xl border border-border bg-surface px-6 py-7 text-center">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <Logo className="mb-4 h-14 w-14 drop-shadow-[0_3px_10px_rgba(0,0,0,0.5)]" />
      <h2 className="mb-5 font-display text-[19px] font-semibold tracking-tight">{title}</h2>
      <GoogleButton
        clientId={clientId}
        onSignedIn={onSignedIn}
        unavailableText="Sign-in isn't configured yet. Come back tomorrow for a fresh set of questions."
      />
    </div>
  );
}
