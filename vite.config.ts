import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const API = "https://api.attendanceio.paramsavjani.in";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  // In development the API is proxied through this origin, so the browser makes same-origin
  // requests and the backend's CORS list does not need a localhost port in it. `.env.development`
  // leaves VITE_API_BASE_URL empty for exactly this reason.
  server: {
    proxy: {
      "/api": {
        target: API,
        changeOrigin: true,
        secure: true,
        // The backend allows the demo's own origin and nothing else, so present that one rather
        // than adding a localhost port to the production CORS list.
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyRequest) => {
            proxyRequest.setHeader("origin", "https://ai.paramsavjani.in");
          });
        },
      },
    },
  },
});
