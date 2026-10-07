import fs from "node:fs";
import path from "node:path";
import type { Page, TestInfo } from "@playwright/test";
import { test, expect } from "./fixtures";
import { findOverflow, findSmallButtons, goTab, loadDemo, openApp, openFirstEdit, type Tab } from "./helpers/app";

const OUT = path.join(process.cwd(), "test-results", "visual");
const THEMES = ["light", "dark"] as const;

const viewportOf = (info: TestInfo) => info.project.name.replace("chromium-", "")  // desktop | mobile | mobile-small;

/** Captura la pantalla y revisa desborde horizontal y tamaños de botones. Los fallos se acumulan. */
async function inspect(page: Page, info: TestInfo, name: string, theme: string, fullPage: boolean) {
  fs.mkdirSync(OUT, { recursive: true });
  await page.waitForTimeout(500); // termina animaciones de entrada
  await page.screenshot({ path: path.join(OUT, `${name}-${theme}-${viewportOf(info)}.png`), fullPage });
  expect.soft(await findOverflow(page), `${name} (${theme}): desborde horizontal`).toEqual([]);
  expect.soft(await findSmallButtons(page), `${name} (${theme}): botones pequeños`).toEqual([]);
}

async function closeDialogs(page: Page) {
  for (let i = 0; i < 3 && (await page.getByRole("dialog").count()); i++) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);
  }
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

for (const theme of THEMES) {
  test(`12. Recorrido visual (${theme})`, async ({ page, watch }, info) => {
    await page.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch {} }, theme);
    await openApp(page);
    await loadDemo(page);
    await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /light/);

    // guardar un snapshot para tener Historial con una fila
    await page.locator("#save-snapshot-btn").click();
    await page.waitForTimeout(600);

    // ── Pestañas ───────────────────────────────────────────────
    const tabs: [Tab, string][] = [
      ["inicio", "inicio"], ["movimientos", "movimientos"], ["analisis", "analisis"],
      ["ia", "ia"], ["historial", "historial"],
    ];
    for (const [tab, name] of tabs) {
      await goTab(page, tab);
      await inspect(page, info, name, theme, true);
    }

    // ── Modales ────────────────────────────────────────────────
    await goTab(page, "inicio");
    const modal = (name: string) => inspect(page, info, `modal-${name}`, theme, false);

    // registro rápido (botón flotante, en móvil y escritorio) con el teclado numérico
    await page.getByRole("button", { name: "Agregar registro rápido" }).click();
    await expect(page.getByRole("dialog").getByText("Registro rápido")).toBeVisible();
    for (const k of ["1", "2", "5", "0"]) await page.getByRole("dialog").getByRole("button", { name: k, exact: true }).click();
    await modal("registro-rapido");
    await closeDialogs(page);

    await page.getByRole("button", { name: "Transferir", exact: true }).click();
    await expect(page.getByRole("dialog").getByText("Transferir entre cuentas")).toBeVisible();
    await modal("transferir");
    await closeDialogs(page);

    await goTab(page, "movimientos");
    await openFirstEdit(page);
    await expect(page.getByRole("dialog").getByText("Editar movimiento")).toBeVisible();
    await modal("editar");
    await closeDialogs(page);

    await goTab(page, "historial");
    await page.locator("#history-section tbody tr").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await modal("snapshot");
    await closeDialogs(page);

    await page.getByRole("button", { name: "Limpiar", exact: true }).click();
    await expect(page.getByRole("dialog").getByText("Limpiar historial")).toBeVisible();
    await modal("limpiar-historial");
    await closeDialogs(page);

    await goTab(page, "inicio");
    await page.getByRole("button", { name: "Ajustes", exact: true }).click();
    const ajustes = page.getByRole("dialog");
    await expect(ajustes).toBeVisible();
    await modal("ajustes");

    // importar: un archivo que no es respaldo abre el modal de importación con su error
    await page.locator('input[aria-label="Importar respaldo"]').setInputFiles({
      name: "no-es-respaldo.json", mimeType: "application/json", buffer: Buffer.from("esto no es json"),
    });
    await expect(page.getByRole("dialog").getByText(/El archivo no es un respaldo válido/)).toBeVisible();
    await modal("importar");
    await closeDialogs(page);

    expect(watch.consoleErrors, "errores de consola durante el recorrido").toEqual([]);
  });
}
