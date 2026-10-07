import { test, expect } from "./fixtures";
import { addAsset, expectSave, goTab, loadDemo, openApp, panel } from "./helpers/app";

test("9. Transferencia: el aviso nombra monto y cuentas y los saldos cambian", async ({ page }) => {
  await openApp(page);
  await addAsset(page, "Origen E2E", 5000);
  await addAsset(page, "Destino E2E", 100);

  const activos = panel(page, "Ingresos & Activos");
  await page.getByRole("button", { name: "Transferir entre cuentas" }).click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: "De", exact: true }).click();
  await page.locator("[data-slot=listbox] li, [role=option]").filter({ hasText: "Origen E2E" }).click();
  await modal.getByRole("button", { name: "Hacia", exact: true }).click();
  await page.locator("[data-slot=listbox] li, [role=option]").filter({ hasText: "Destino E2E" }).click();
  await modal.getByLabel("Monto").fill("1200");
  await modal.getByRole("button", { name: "Transferir", exact: true }).click();
  await expect(modal).toBeHidden();

  await expect(page.getByText("Transferiste $1,200 de Origen E2E a Destino E2E")).toBeVisible();
  await expect(activos.getByText("$3,800").first()).toBeVisible();
  await expect(activos.getByText("$1,300").first()).toBeVisible();
});

test("10. Edición inválida: el modal no se cierra y explica qué corregir", async ({ page }) => {
  await openApp(page);
  await loadDemo(page);
  await goTab(page, "movimientos");

  await page.locator('button[aria-label^="Editar "]:visible').first().click();
  const modal = page.getByRole("dialog");
  await expect(modal.getByText("Editar movimiento")).toBeVisible();

  // monto vacío
  await modal.getByLabel("Monto").fill("");
  await modal.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(modal).toBeVisible();
  await expect(modal.getByText("Escribe un monto mayor a 0.")).toBeVisible();
  await expect(modal.getByRole("alert")).toHaveText("Revisa los campos marcados.");

  // fecha vacía (lo que deja un <input type=date> con fecha inválida)
  await modal.getByLabel("Monto").fill("50");
  await modal.getByLabel("Fecha").fill("");
  await modal.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(modal).toBeVisible();
  await expect(modal.getByText("Elige una fecha válida.")).toBeVisible();

  // corregido: ahora sí guarda y cierra
  await modal.getByLabel("Fecha").fill("2026-10-01");
  await modal.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(modal).toBeHidden();
});

test("11. Presupuesto duplicado: una categoría con presupuesto ya no se puede elegir", async ({ page }) => {
  await openApp(page);
  const presupuestos = panel(page, "Presupuestos del mes");

  await presupuestos.getByLabel("Límite mensual").fill("3000");
  await presupuestos.getByRole("button", { name: "Crear presupuesto" }).click();
  await expect(presupuestos.getByLabel(/Editar límite de/)).toHaveCount(1);
  const creada = await presupuestos.getByLabel(/Eliminar presupuesto de/).getAttribute("aria-label");
  const categoria = creada!.replace("Eliminar presupuesto de ", "");

  await presupuestos.getByRole("button", { name: "Categoría" }).click();
  await expect(page.getByRole("option", { name: categoria, exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");

  // y aunque se intente crear otro, sigue habiendo un solo presupuesto de esa categoría
  await presupuestos.getByLabel("Límite mensual").fill("999");
  await presupuestos.getByRole("button", { name: "Crear presupuesto" }).click();
  await expect(presupuestos.getByLabel(`Eliminar presupuesto de ${categoria}`)).toHaveCount(1);
});

test("13. Análisis: la distribución de gastos refleja los gastos del mes", async ({ page }) => {
  await openApp(page);
  await goTab(page, "movimientos");

  for (const [que, monto] of [["Tacos E2E", "250"], ["Cine E2E", "100"]]) {
    await page.getByPlaceholder("¿En qué?").fill(que);
    await page.locator(`input[placeholder="0.00"]:visible`).fill(monto);
    const saved = expectSave(page);
    await page.getByRole("button", { name: "Registrar", exact: true }).click();
    await saved;
    await expect(page.getByText(que).first()).toBeVisible();
  }

  await goTab(page, "analisis");
  const tarjeta = page.locator("div.glass").filter({ has: page.getByRole("heading", { name: "Distribución de gastos" }) });
  await expect(tarjeta.getByText("Aún no hay gastos este mes")).toHaveCount(0);
  await expect(tarjeta.getByText("$350").first()).toBeVisible(); // total del mes
  await expect(tarjeta.locator("li")).not.toHaveCount(0);
});
