import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { goTab, loadDemo, openApp, panel, pick } from "./helpers/app";

// Pulido móvil: nada se corta (títulos de fila y disparadores de Picker), ni a escala normal ni con
// la fuente del sistema al 120 %. Ver docs/e2e-plan.md.

const OUT = path.join(process.cwd(), "test-results", "visual");

/** Elementos cuyo texto se sale de su caja (.it b ya recorta a 2 líneas con -webkit-line-clamp: el ancho no debe pasarse). */
async function truncated(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const sel = ".it .t b, .pk-btn, .pk-val, .pk-opt span";
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      if (!el.offsetParent) continue; // oculto
      if (el.scrollWidth > el.clientWidth) out.push(`${el.className || el.tagName} sw=${el.scrollWidth} cw=${el.clientWidth} "${(el.textContent || "").trim().slice(0, 40)}"`);
    }
    return out;
  });
}

/** Simula la escala de fuente del sistema: todo está en rem, así que basta con el tamaño raíz. */
async function fontScale(page: Page, scale: number) {
  await page.addStyleTag({ content: `html { font-size: ${scale * 100}% !important; }` });
  await page.waitForTimeout(250);
}

for (const scale of [1, 1.2]) {
  test(`14. Móvil: ningún título de fila ni selector se corta (fuente ×${scale})`, async ({ page }, info) => {
    test.skip(scale !== 1 && info.project.name === "chromium-desktop", "La escala de fuente se prueba en móvil");
    await openApp(page);
    await loadDemo(page);
    if (scale !== 1) await fontScale(page, scale);

    // una fila con título largo y datos reales: "Tarjeta de Crédito", "Fondo de emergencia"
    const activos = panel(page, "Ingresos y activos");
    await activos.getByPlaceholder("Descripción").fill("Quincena 30 sep");
    await activos.getByPlaceholder("$ 0.00").fill("18450");
    const agregar = activos.getByRole("button", { name: "Agregar", exact: true });
    await agregar.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" })); // la barra fija y el "+" no lo tapan
    await agregar.click();
    await expect(activos.getByText("Quincena 30 sep")).toBeVisible();

    // el Picker abre con el valor completo; se elige una categoría larga
    await pick(page, activos, "Categoría", "Banco");

    expect(await truncated(page), "inicio").toEqual([]);
    await goTab(page, "movimientos");
    expect(await truncated(page), "movimientos").toEqual([]);

    // Picker abierto: las filas de la hoja/menú tampoco se cortan
    await page.getByRole("combobox", { name: "Filtrar categoría", exact: true }).click();
    await expect(page.getByRole("listbox", { name: "Filtrar categoría" })).toBeVisible();
    expect(await truncated(page), "picker abierto").toEqual([]);
    fs.mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: path.join(OUT, `picker-x${scale}-${info.project.name.replace("chromium-", "")}.png`) });
  });
}
