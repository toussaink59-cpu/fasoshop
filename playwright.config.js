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
  timeout: process.env.CI ? 90_000 : 30_000,
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
      NODE_ENV: "test",
      NODE_ENV: "test",
      PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || "sandbox",
      JWT_SECRET: process.env.JWT_SECRET || "ci-jwt-secret-e2e",
      INTERNAL_STATUS_SECRET: process.env.INTERNAL_STATUS_SECRET || "",
      DATABASE_URL: process.env.E2E_DATABASE_URL || process.env.DATABASE_URL,
      APP_BASE_URL: process.env.APP_BASE_URL || "ci-e2e-default",
      CINETPAY_WEBHOOK_SECRET: process.env.CINETPAY_WEBHOOK_SECRET || "ci-e2e-default",
      LIGDICASH_API_KEY: process.env.LIGDICASH_API_KEY || "ci-e2e-default",
      LIGDICASH_API_USER: process.env.LIGDICASH_API_USER || "ci-e2e-default",
      LIGDICASH_MODE: process.env.LIGDICASH_MODE || "ci-e2e-default",
      LIGDICASH_WEBHOOK_SECRET: process.env.LIGDICASH_WEBHOOK_SECRET || "ci-e2e-default",
      PAYMENT_SANDBOX_SECRET: process.env.PAYMENT_SANDBOX_SECRET || "ci-e2e-default",
      ALLOW_SANDBOX_IN_PROD: process.env.ALLOW_SANDBOX_IN_PROD || "ci-e2e-default",
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
