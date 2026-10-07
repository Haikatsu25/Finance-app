import path from "node:path";
import { defineConfig, devices } from "@playwright/test";
import "./tests/e2e/env"; // DNS + .env.local (también lo cargan los workers)

// E2E: ver docs/e2e-plan.md. Servidor local + base `finance-test`; una sola cuenta de prueba,
// así que todo corre en serie (workers: 1) y cada prueba empieza con su documento vacío.

const PORT = 3000;
export const AUTH_FILE = path.resolve("tests/e2e/.auth/user.json");

// Edge ya viene con Windows; evita descargar Chromium. Con E2E_BROWSER_CHANNEL="" se usa el
// Chromium de Playwright (`npx playwright install chromium`).
const channel = (process.env.E2E_BROWSER_CHANNEL ?? "msedge") || undefined;

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: /.*\.spec\.ts/,
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "test-results/artifacts",

  use: {
    baseURL: `http://localhost:${PORT}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    actionTimeout: 25_000,
    navigationTimeout: 90_000,
    channel,
    storageState: AUTH_FILE,
  },

  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], channel, viewport: { width: 1366, height: 900 } },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Desktop Chrome"], channel, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
    {
      // Pantalla chica (360x780): solo el recorrido visual y la comprobación de textos/selectores
      name: "mobile-small",
      testMatch: /0[45]-.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], channel, viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
  ],

  // Reutiliza el servidor si ya está arriba; si no, lo levanta con la precarga de DNS
  // (el DNS del sistema que ve Node no responde SRV y Mongo Atlas lo necesita).
  webServer: {
    command: "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 180_000,
    env: { NODE_OPTIONS: `--require "${path.resolve("tests/e2e/dns-fix.cjs").replace(/\\/g, "/")}"` },
  },
});
