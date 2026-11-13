import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

// The test runs against the production build served by `vite preview`, not the dev server.
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
