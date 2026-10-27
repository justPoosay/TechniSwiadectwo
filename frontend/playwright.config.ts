import { defineConfig, devices } from "@playwright/test";

// E2E tests run against an already running app (Docker Compose locally, or the
// servers started by the CI job) seeded with `python manage.py seed_e2e`.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "pl-PL",
    timezoneId: "Europe/Warsaw",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
