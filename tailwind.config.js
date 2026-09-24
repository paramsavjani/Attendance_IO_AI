/**
 * Two families, clearly distinct. Outfit is the Attendance IO app's own geometric face and carries
 * the brand into the chrome — wordmark, hero, buttons. IBM Plex Sans carries everything the
 * assistant actually says: it was drawn for dense technical and institutional text, handles
 * tables of companies and placement figures without going mushy, and reads cleanly at 16px.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        display: ["Outfit", "system-ui", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        border: "hsl(var(--border))",
      },
      maxWidth: { answer: "48rem" },
    },
  },
  plugins: [],
};
