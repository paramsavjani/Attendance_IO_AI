import { useEffect, useState } from "react";
import { ArrowUpRight, Github } from "lucide-react";
import { Chat } from "./components/Chat";
import { Spark } from "./components/Spark";
import { fetchDemoInfo } from "./lib/agent";

const APP_URL = "https://attendanceio.paramsavjani.in";
const REPO_URL = "https://github.com/paramsavjani/Attendance_IO_Frontend";

/** Shown before anyone asks anything, so the demo's edges are obvious from the start. */
const CAN_ANSWER = [
  "Clubs & committees",
  "Faculty & offices",
  "Curriculum & subjects",
  "Lecture timetables",
  "Placements & recruiters",
  "Alumni & where they work",
  "Events, holidays & calendar",
  "Scholarships & services",
];

const FALLBACK_SUGGESTIONS = [
  "Which clubs can I join at DAU?",
  "Who teaches machine learning here?",
  "Where do DAU graduates work?",
  "What were the placement figures last year?",
];

export default function App() {
  const [suggestions, setSuggestions] = useState<string[]>(FALLBACK_SUGGESTIONS);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetchDemoInfo(controller.signal).then((info) => {
      if (info?.suggestions?.length) setSuggestions(info.suggestions.slice(0, 6));
    });
    return () => controller.abort();
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-readable items-center gap-3 px-4">
          <div className="h-6 w-6 text-primary">
            <Spark />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-none">Attendance IO AI</p>
            <p className="mt-0.5 text-[11px] leading-none text-muted-foreground">The DAU assistant</p>
          </div>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Source on GitHub"
            className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" />
          </a>
          <a
            href={APP_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-2 text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open the app
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-readable flex-1 flex-col px-4">
        {!started && (
          <section className="relative pb-7 pt-10 text-center sm:pt-16">
            <div className="hero-glow pointer-events-none absolute inset-x-0 -top-14 h-56" aria-hidden />
            <div className="relative">
              <h1 className="text-balance text-[28px] font-semibold leading-tight sm:text-[40px]">
                Ask anything about DAU
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-pretty text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">
                It has read every notice, handbook, timetable and placement report DA-IICT publishes — and
                answers in a few seconds. Ask it like you'd ask a senior. The same assistant lives inside{" "}
                <a
                  href={APP_URL}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-foreground underline underline-offset-2 decoration-border hover:decoration-foreground"
                >
                  Attendance IO
                </a>
                , the app students use every day.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-1.5">
                {CAN_ANSWER.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-border bg-card/70 px-3 py-1 text-[12px] text-muted-foreground"
                  >
                    {topic}
                  </span>
                ))}
              </div>
              <p className="mx-auto mt-5 max-w-md text-[12.5px] leading-relaxed text-muted-foreground">
                Attendance stays where it belongs — behind a student login in the app. Nothing on this page can
                read a student's records.
              </p>
            </div>
          </section>
        )}

        <Chat suggestions={suggestions} onFirstMessage={() => setStarted(true)} />
      </main>

      <footer className="mx-auto w-full max-w-readable px-4 pb-6 pt-2">
        <p className="text-center text-[11.5px] leading-relaxed text-muted-foreground">
          Built by{" "}
          <a
            href="https://paramsavjani.in"
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-foreground/80 underline underline-offset-2 hover:text-foreground"
          >
            Param Savjani
          </a>{" "}
          · Institute information is published by DA-IICT and its student bodies · Questions are limited per
          visitor per day to keep the demo running
        </p>
      </footer>
    </div>
  );
}
