import { defineConfig } from "@playwright/test";

const port = process.env.PORT ?? "3000";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/smoke",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        // Use the profile-aware local runtime so smoke always targets development demo data.
        command: `npm run dev:local -- -BindHost 127.0.0.1 -Port ${port}`,
        url: `${baseURL}/today`,
        reuseExistingServer: false,
        timeout: 120_000,
      },
});