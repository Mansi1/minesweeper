import { defineConfig, devices } from "@playwright/test";

// VERIFIED: `make e2e` serves the built dist/ via `make start` before this runs, so no Playwright webServer is needed.
export default defineConfig({
  testDir: "e2e",
  testMatch: "*.e2e.ts",
  outputDir: "output/playwright",
  reporter: [["list"], ["json", { outputFile: "output/e2e-results.json" }]],
  use: { baseURL: `http://localhost:${process.env.PORT ?? 8080}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
