import { test as base, expect } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { resetFinance } from "./helpers/db";

export type Watch = {
  /** Errores de consola y excepciones de la página (los avisos/warnings no cuentan). */
  consoleErrors: string[];
  /** Respuestas de /api/finance, en orden. */
  finance: { method: string; status: number }[];
};

export const test = base.extend<{ watch: Watch; cleanDb: void }>({
  // Cada prueba empieza con el documento de finanzas vacío (solo en finance-test).
  cleanDb: [
    async ({}, use) => {
      await resetFinance();
      await use();
    },
    { auto: true },
  ],

  watch: [
    async ({ page }, use) => {
      // Token de pruebas de Clerk: antes de navegar, para saltar el anti-bots.
      await setupClerkTestingToken({ page });
      // el indicador de Next en modo desarrollo (esquina inferior izquierda) tapa la barra inferior móvil
      await page.addInitScript(() => {
        const st = document.createElement("style");
        st.textContent = "nextjs-portal { pointer-events: none !important; }";
        document.addEventListener("DOMContentLoaded", () => document.head.appendChild(st));
      });
      const w: Watch = { consoleErrors: [], finance: [] };
      page.on("console", (m) => {
        if (m.type() === "error") w.consoleErrors.push(m.text().slice(0, 300));
      });
      page.on("pageerror", (e) => w.consoleErrors.push(`pageerror: ${String(e).slice(0, 300)}`));
      page.on("response", (r) => {
        if (new URL(r.url()).pathname === "/api/finance") w.finance.push({ method: r.request().method(), status: r.status() });
      });
      await use(w);
    },
    { auto: true },
  ],
});

export { expect };
