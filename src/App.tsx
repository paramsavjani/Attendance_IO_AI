import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Chat } from "./components/Chat";
import { Logo } from "./components/Logo";
import { AccountMenu } from "./components/AccountMenu";
import { GithubMark } from "./components/GithubMark";
import { WelcomeSignIn } from "./components/WelcomeSignIn";
import { fetchDemoInfo, type DemoInfo } from "./lib/agent";
import {
  rememberWelcomeClosed,
  signOut,
  storedCredential,
  welcomeClosed,
  type GoogleUser,
} from "./lib/auth";
import { cn } from "./lib/utils";

const APP_URL = "https://attendanceio.paramsavjani.in";
const REPO_URL = "https://github.com/paramsavjani/Attendance_IO_Frontend";

export default function App() {
  const [info, setInfo] = useState<DemoInfo | null>(null);
  const [user, setUser] = useState<GoogleUser | null>(() => storedCredential());
  const [token, setToken] = useState<string | null>(() => storedCredential()?.token ?? null);
  const resetChat = useRef<(() => void) | null>(null);
  const viewportHeight = useVisualViewportHeight();
  // The first-visit sign-in card: offered to anyone who hasn't signed in and hasn't already closed
  // it, and only once the server has told us which Google client to sign in with.
  const [welcomeOpen, setWelcomeOpen] = useState(() => !storedCredential() && !welcomeClosed());

  const refreshInfo = useCallback(
    (signal?: AbortSignal) => {
      void fetchDemoInfo(token, signal).then((next) => {
        if (next) setInfo(next);
      });
    },
    [token]
  );

  useEffect(() => {
    const controller = new AbortController();
    refreshInfo(controller.signal);
    return () => controller.abort();
  }, [refreshInfo]);

  const onSignedIn = useCallback((signedIn: GoogleUser) => {
    const stored = storedCredential();
    setUser(signedIn);
    setToken(stored?.token ?? null);
    setWelcomeOpen(false);
  }, []);

  const closeWelcome = useCallback(() => {
    rememberWelcomeClosed();
    setWelcomeOpen(false);
  }, []);

  const leave = () => {
    signOut();
    setUser(null);
    setToken(null);
  };

  return (
    <div
      className="page-field fixed inset-x-0 top-0 flex flex-col"
      // Follows the visual viewport, so the composer sits right above the keyboard when it opens.
      style={{ height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}
    >
      <header
        // relative z-30: backdrop-blur makes this a stacking context of its own, so without a
        // z-index here the message list below paints straight over the open account menu.
        className="relative z-30 flex shrink-0 justify-center border-b border-border/70 bg-background/80 px-5 pb-3 backdrop-blur-xl sm:px-8"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <div className="flex w-full max-w-answer items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <Logo className="h-8 w-8 shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]" />
            <h1 className="truncate font-display text-[16px] font-semibold tracking-tight">Attendance IO AI</h1>
          </div>

          {/* Secondary controls: given a quiet outline so they read as buttons rather than glyphs
              floating next to the one solid button in the bar. */}
          <button
            type="button"
            onClick={() => resetChat.current?.()}
            aria-label="New chat"
            title="New chat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/80 bg-surface/50 text-muted-foreground transition-colors hover:border-border hover:bg-surface hover:text-foreground"
          >
            <Plus className="h-[18px] w-[18px]" />
          </button>
          {/* Each destination wears its own mark on a white disc — GitHub's here, the app's below.
              The outlined button beside them is an action, not a place, so it stays unbranded. */}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Source on GitHub"
            title="Source on GitHub"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#181717] transition-opacity hover:opacity-85"
          >
            <GithubMark className="h-[21px] w-[21px]" />
          </a>

          {/* The app's own icon rides inside the button, on a white disc so the colour mark reads
              against the indigo. Once someone is signed in the label drops away and it keeps only
              the icon, leaving the room in the bar to their account. */}
          <a
            href={APP_URL}
            target="_blank"
            rel="noreferrer noopener"
            title="Open Attendance IO"
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full bg-primary p-1 text-[13.5px] font-medium text-primary-foreground transition-opacity hover:opacity-90",
              !user && "gap-2 sm:pr-4"
            )}
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white">
              <Logo className="h-[18px] w-[18px]" />
            </span>
            {!user && <span className="hidden sm:inline">Open Attendance IO</span>}
          </a>

          <AccountMenu
            user={user}
            clientId={info?.googleClientId ?? null}
            remaining={info?.remaining}
            dailyLimit={info?.signedInLimit}
            onSignedIn={onSignedIn}
            onSignOut={leave}
          />
        </div>
      </header>

      <Chat
        info={info}
        token={token}
        onSignedIn={onSignedIn}
        onAnswered={refreshInfo}
        onReset={(reset) => {
          resetChat.current = reset;
        }}
      />

      {welcomeOpen && !user && info?.googleClientId && (
        <WelcomeSignIn
          clientId={info.googleClientId}
          onSignedIn={onSignedIn}
          onClose={closeWelcome}
        />
      )}
    </div>
  );
}

/**
 * Height of the visible area, which shrinks when the on-screen keyboard opens. Null until the API
 * reports, in which case the CSS fallback applies.
 */
function useVisualViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(() =>
    typeof window !== "undefined" && window.visualViewport ? Math.round(window.visualViewport.height) : null
  );
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setHeight(Math.round(viewport.height));
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    update();
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);
  return height;
}
