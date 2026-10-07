import fs from "node:fs";
import path from "node:path";
import type { Page, TestInfo } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";
import { test, expect } from "./fixtures";
import { TEST_EMAIL } from "./env";
import { findOverflow } from "./helpers/app";

// Pantalla de entrada con candado (components/dashboard/BiometricLockScreen.tsx). Ver docs/e2e-plan.md.

const OUT = path.join(process.cwd(), "test-results", "visual");
const viewportOf = (info: TestInfo) => info.project.name.replace("chromium-", "");

/** Candado activado en el dispositivo: fc_lock_on=1 + credencial falsa; y biometría "disponible". */
async function lockOn(page: Page, { getRejects = true } = {}) {
  await page.addInitScript((rejects) => {
    localStorage.setItem("fc_lock_on", "1");
    localStorage.setItem("fc_lock_cred", "ZmFrZS1jcmVkZW5jaWFs");
    (window as unknown as { __credGets: number }).__credGets = 0;
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = async () => true;
    }
    const creds = navigator.credentials;
    if (creds) {
      creds.get = async () => {
        (window as unknown as { __credGets: number }).__credGets++;
        if (rejects) throw new DOMException("cancelado", "NotAllowedError");
        return {} as Credential;
      };
    }
  }, getRejects);
}

const lockScreen = (page: Page) => page.getByRole("dialog", { name: "Pantalla de entrada" });

/** Nada se corta en la pantalla de entrada: textos sin scrollWidth > clientWidth y botones de ≥44px. */
async function expectNoCut(page: Page) {
  const bad = await page.evaluate(() => {
    const out: string[] = [];
    const root = document.querySelector('[role="dialog"][aria-label="Pantalla de entrada"]')!;
    for (const el of Array.from(root.querySelectorAll<HTMLElement>("h2, p, button, button span"))) {
      if (el.scrollWidth > el.clientWidth + 1) out.push(`${el.tagName} sw=${el.scrollWidth} cw=${el.clientWidth} "${(el.textContent || "").trim().slice(0, 30)}"`);
    }
    for (const b of Array.from(root.querySelectorAll<HTMLElement>("button"))) {
      const r = b.getBoundingClientRect();
      if (r.height < 43.5) out.push(`botón bajo ${Math.round(r.height)}px "${(b.textContent || "").trim().slice(0, 30)}"`);
    }
    return out;
  });
  expect(bad, "pantalla de entrada: textos cortados o botones bajos").toEqual([]);
  expect(await findOverflow(page), "desborde horizontal").toEqual([]);
}

for (const scale of [1, 1.2]) {
  test(`19. Candado: nombre, huella y "Entrar con mi cuenta"; la huella solo al tocar (fuente ×${scale})`, async ({ page }, info) => {
    await lockOn(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const lock = lockScreen(page);
    await expect(lock).toBeVisible({ timeout: 90_000 });
    if (scale !== 1) await page.addStyleTag({ content: `html { font-size: ${scale * 100}% !important; }` });

    await expect(lock.getByText("Hola, E2E")).toBeVisible();
    await expect(lock.getByRole("button", { name: "Usar huella o rostro" })).toBeVisible();
    await expect(lock.getByRole("button", { name: "Entrar con mi cuenta" })).toBeVisible();
    await expect(lock.getByRole("button", { name: "¿No eres tú? Cambiar de cuenta" })).toBeVisible();

    // nunca se pide la huella sola al montar
    await page.waitForTimeout(1_500);
    expect(await page.evaluate(() => (window as unknown as { __credGets: number }).__credGets)).toBe(0);
    await expectNoCut(page);

    // el sistema cancela la huella: mensaje corto y la pantalla sigue abierta
    await lock.getByRole("button", { name: "Usar huella o rostro" }).click();
    await expect(lock.getByRole("alert")).toHaveText("No se pudo verificar. Intenta de nuevo o entra con tu cuenta.");
    await expect(lock).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __credGets: number }).__credGets)).toBe(1);
    await expectNoCut(page);

    fs.mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: path.join(OUT, `candado-x${scale}-${viewportOf(info)}.png`) });
  });
}

test("20. Candado: la huella correcta desbloquea y abre la app", async ({ page }) => {
  await lockOn(page, { getRejects: false });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const lock = lockScreen(page);
  await expect(lock).toBeVisible({ timeout: 90_000 });
  await lock.getByRole("button", { name: "Usar huella o rostro" }).click();
  await expect(lock).toBeHidden();
  await expect(page.locator("#balance-card")).toBeVisible();
});

test.describe("21. Entrar con mi cuenta", () => {
  // Sesión propia: cerrarla no invalida la sesión compartida (storageState) de las demás pruebas.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("cierra la sesión, muestra el inicio de sesión y deja el candado activado", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 90_000 });
    await clerk.signIn({ page, emailAddress: TEST_EMAIL });
    await lockOn(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const lock = lockScreen(page);
    await expect(lock).toBeVisible({ timeout: 90_000 });

    await lock.getByRole("button", { name: "Entrar con mi cuenta" }).click();

    // aparece el inicio de sesión normal
    await expect(page.getByRole("button", { name: "Iniciar sesión" }).first()).toBeVisible({ timeout: 30_000 });
    await expect(lock).toHaveCount(0);
    // el candado sigue activado para la próxima apertura; la marca de una sola vez quedó puesta
    expect(await page.evaluate(() => localStorage.getItem("fc_lock_on"))).toBe("1");
    expect(await page.evaluate(() => sessionStorage.getItem("fc_lock_skip_once"))).toBe("1");
  });
});
