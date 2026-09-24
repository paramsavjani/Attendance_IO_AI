import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Github, LogOut, RotateCcw } from "lucide-react";
import { Chat } from "./components/Chat";
import { Logo } from "./components/Logo";
import { fetchDemoInfo, type DemoInfo } from "./lib/agent";
import { signOut, storedCredential, type GoogleUser } from "./lib/auth";

const APP_URL = "https://attendanceio.paramsavjani.in";
const REPO_URL = "https://github.com/paramsavjani/Attendance_IO_Frontend";

export default function App() {
  const [info, setInfo] = useState<DemoInfo | null>(null);
  const [user, setUser] = useState<GoogleUser | null>(() => storedCredential());
  const [token, setToken] = useState<string | null>(() => storedCredential()?.token ?? null);
  const resetChat = useRef<(() => void) | null>(null);
  const viewportHeight = useVisualViewportHeight();

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
  }, []);

  const leave = () => {
    signOut();
    setUser(null);
    setToken(null);
  };

  return (
    <div
      className="fixed inset-x-0 top-0 flex flex-col bg-background"
      // Follows the visual viewport, so the composer sits right above the keyboard when it opens.
      style={{ height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}
    >
      <header
        className="flex shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 pb-2.5 backdrop-blur"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="liquid-nav flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
            <Logo className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold leading-tight">Attendance IO AI</h1>
            <p className="truncate text-[11px] text-muted-foreground">Clubs, faculty, placements &amp; alumni</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => resetChat.current?.()}
          aria-label="New chat"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="h-[18px] w-[18px]" />
        </button>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Source on GitHub"
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        >
          <Github className="h-[18px] w-[18px]" />
        </a>

        {user ? (
          <button
            type="button"
            onClick={leave}
            title={user.name ? `Signed in as ${user.name} — sign out` : "Sign out"}
            className="flex h-9 items-center gap-1.5 rounded-full border border-border pl-1 pr-2.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            {user.picture ? (
              <img src={user.picture} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-[11px] text-foreground">
                {(user.name ?? "?").slice(0, 1)}
              </span>
            )}
            <LogOut className="h-3.5 w-3.5" />
          </button>
        ) : (
          <a
            href={APP_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <span className="hidden sm:inline">Open the app</span>
            <span className="sm:hidden">App</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        )}
      </header>

      <Chat
        info={info}
        token={token}
        onSignedIn={onSignedIn}
        onAnswered={() => refreshInfo()}
        onReset={(reset) => {
          resetChat.current = reset;
        }}
      />
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
