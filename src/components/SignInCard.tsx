import { Logo } from "./Logo";
import { GoogleButton } from "./GoogleButton";
import type { GoogleUser } from "@/lib/auth";

/** Shown in the thread once a visitor has used their free questions. */
export function SignInCard({
  clientId,
  onSignedIn,
}: {
  clientId: string | null;
  onSignedIn: (user: GoogleUser) => void;
}) {
  return (
    <div className="hero-in mx-auto flex w-full max-w-sm flex-col items-center rounded-2xl border border-border bg-surface px-6 py-7 text-center">
      <Logo className="mb-4 h-14 w-14 drop-shadow-[0_3px_10px_rgba(0,0,0,0.5)]" />
      <h2 className="mb-5 font-display text-[19px] font-semibold tracking-tight">Sign in again to keep asking</h2>
      <GoogleButton
        clientId={clientId}
        onSignedIn={onSignedIn}
        unavailableText="Sign-in isn't configured yet. Come back tomorrow for a fresh set of questions."
      />
    </div>
  );
}
