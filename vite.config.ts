import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The admin UI lives under /~/ and is served by the Hono server in production.
export default defineConfig({
  root: "src/web",
  base: "/~/",
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/~/api": "http://localhost:3000",
      "/~/auth": "http://localhost:3000",
      "/~/media": "http://localhost:3000",
    },
  },
});
