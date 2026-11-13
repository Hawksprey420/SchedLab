import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // The generated schedlab.mjs embeds the WebAssembly binary (about 400 kB); it is the bundle.
    chunkSizeWarningLimit: 700,
  },
  server: {
    // The example workloads live in the repository-level examples/ directory, outside web/.
    fs: { allow: [".."] },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // The Playwright spec in e2e/ must not be collected by Vitest.
    exclude: ["e2e/**", "node_modules/**"],
    // Vitest blanks every CSS file by default. The tokens are read as text by
    // src/lib/processStyle.ts, so that one file must keep its content.
    css: { include: [/styles\/tokens\.css/] },
  },
});
