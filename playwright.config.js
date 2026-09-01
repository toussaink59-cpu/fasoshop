// @ts-check
import { defineConfig, devices } from "@playwright/test";

// Charger .env.local pour que les tests aient acces aux vraies valeurs
// (INTERNAL_STATUS_SECRET, etc.)
import { config } from "dotenv";
import path from "path";
try {
  config({ path: path.resolve(process.cwd(), ".env.local") });
} catch (e) {
  console.warn("[playwright] .env.local introuvable, utilisation des defauts");
}

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.js",
  timeout: process.env.CI ? 60_000 : 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
    ignoreHTTPSErrors: true,
  },

  webServer: {
    command: "npm run dev -- -p 3001",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ALLOW_TEST_HELPERS: "1",
      PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || "sandbox",
      JWT_SECRET: process.env.JWT_SECRET || "ci-jwt-secret-e2e",
      INTERNAL_STATUS_SECRET: process.env.INTERNAL_STATUS_SECRET || "",
      DATABASE_URL: process.env.E2E_DATABASE_URL || process.env.DATABASE_URL,
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
