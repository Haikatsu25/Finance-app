import fs from "node:fs";
import path from "node:path";
import { chromium, type FullConfig } from "@playwright/test";
import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/backend";
import { assertSafeEnvironment, BASE_URL, TEST_EMAIL } from "./env";
import { resetFinance } from "./helpers/db";

const AUTH_FILE = path.resolve("tests/e2e/.auth/user.json");
const META_FILE = path.resolve("tests/e2e/.auth/meta.json");

export default async function globalSetup(config: FullConfig) {
  assertSafeEnvironment();
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.mkdirSync(path.resolve("test-results/visual"), { recursive: true });

  // 1) Token de pruebas de Clerk (instancia de desarrollo): salta el anti-bots de Cloudflare.
  await clerkSetup();

  // 2) Usuario de prueba: se busca por correo y, si no existe, se crea con la Backend API.
  const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  const found = await clerkClient.users.getUserList({ emailAddress: [TEST_EMAIL] });
  const user =
    found.data[0] ??
    (await clerkClient.users.createUser({
      emailAddress: [TEST_EMAIL],
      firstName: "E2E",
      lastName: "Finance",
      skipPasswordRequirement: true,
    }));
  process.env.E2E_USER_ID = user.id;
  fs.writeFileSync(META_FILE, JSON.stringify({ userId: user.id, email: TEST_EMAIL }, null, 2));
  console.log(`[e2e] usuario de prueba: ${TEST_EMAIL} (${found.data[0] ? "ya existía" : "creado"})`);

  // 3) Limpieza: la corrida empieza con el documento de finanzas vacío (solo en finance-test).
  const removed = await resetFinance(user.id);
  console.log(`[e2e] documento de finanzas borrado de finance-test: ${removed}`);

  // 4) Sesión: se entra una vez y se guarda el estado para reutilizarlo en todas las pruebas.
  const channel = (process.env.E2E_BROWSER_CHANNEL ?? "msedge") || undefined;
  const browser = await chromium.launch({ channel });
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await clerk.signIn({ page, emailAddress: TEST_EMAIL });
  await page.goto("/", { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator("#balance-card").waitFor({ state: "visible", timeout: 120_000 });
  await context.storageState({ path: AUTH_FILE });
  await browser.close();
  console.log(`[e2e] sesión guardada en ${path.relative(process.cwd(), AUTH_FILE)}`);
  void config;
}
