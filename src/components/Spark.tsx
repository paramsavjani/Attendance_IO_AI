import { cn } from "@/lib/utils";

/** The assistant's mark, same four-point spark as the app's button. */
export function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("h-full w-full", className)}>
      <path
        d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"
        fill="currentColor"
      />
      <circle cx="18" cy="17.5" r="2" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
