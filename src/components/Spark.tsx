/** The assistant's mark, the same gradient spark the app uses. */
export function Spark({ className, gradientId = "spark-gradient" }: { className?: string; gradientId?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(234 89% 70%)" />
          <stop offset="0.55" stopColor="hsl(262 83% 66%)" />
          <stop offset="1" stopColor="hsl(292 84% 64%)" />
        </linearGradient>
      </defs>
      <path
        d="M11 3.5c.3-.9 1.7-.9 2 0l1.6 4.9a1 1 0 0 0 .6.6l4.9 1.6c.9.3.9 1.7 0 2l-4.9 1.6a1 1 0 0 0-.6.6L13 19.7c-.3.9-1.7.9-2 0l-1.6-4.9a1 1 0 0 0-.6-.6L3.9 12.6c-.9-.3-.9-1.7 0-2l4.9-1.6a1 1 0 0 0 .6-.6L11 3.5Z"
        fill={`url(#${gradientId})`}
      />
      <path
        d="M18.5 2.2c.1-.4.7-.4.8 0l.5 1.4c0 .1.1.2.2.2l1.4.5c.4.1.4.7 0 .8l-1.4.5a.3.3 0 0 0-.2.2l-.5 1.4c-.1.4-.7.4-.8 0l-.5-1.4a.3.3 0 0 0-.2-.2l-1.4-.5c-.4-.1-.4-.7 0-.8l1.4-.5c.1 0 .2-.1.2-.2l.5-1.4Z"
        fill={`url(#${gradientId})`}
        opacity="0.95"
      />
    </svg>
  );
}
