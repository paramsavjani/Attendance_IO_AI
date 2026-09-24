/** Same tokens as the Attendance IO app, so the demo looks like the product it demonstrates. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["Outfit", "system-ui", "sans-serif"] },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        border: "hsl(var(--border))",
      },
      maxWidth: { readable: "48rem" },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "none" } },
        blink: { "0%, 100%": { opacity: "1" }, "50%": { opacity: "0.2" } },
      },
      animation: { "fade-up": "fade-up 0.25s ease-out both", blink: "blink 1.1s ease-in-out infinite" },
    },
  },
  plugins: [],
};
