/** The Attendance IO app's own logo — the same mark on the phone, the tab and this page. */
export function Logo({ className }: { className?: string }) {
  return <img src="/logo.png" alt="Attendance IO" className={className} draggable={false} />;
}
