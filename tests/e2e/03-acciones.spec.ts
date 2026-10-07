import { test, expect } from "./fixtures";
import { addAsset, dismissSuccess, expectSave, goTab, loadDemo, openApp, openFirstEdit, panel, pick } from "./helpers/app";

test("9. Transferencia: el aviso nombra monto y cuentas y los saldos cambian", async ({ page }) => {
  await openApp(page);
  await addAsset(page, "Origen E2E", 5000);
  await addAsset(page, "Destino E2E", 100);

  const activos = panel(page, "Ingresos y activos");
  await page.getByRole("button", { name: "Transferir", exact: true }).click();
  const modal = page.getByRole("dialog");
  await pick(page, modal, "De", "Origen E2E, $5,000");
  await pick(page, modal, "Hacia", "Destino E2E, $100");
  await modal.getByLabel("Monto").fill("1200");
  await modal.getByRole("button", { name: "Transferir", exact: true }).click();
  await expect(modal).toBeHidden();

  await expect(page.getByText("Transferiste $1,200 de Origen E2E a Destino E2E")).toBeVisible();
  await expect(activos.getByText("$3,800").first()).toBeVisible();
  await expect(activos.getByText("$1,300").first()).toBeVisible();
  await dismissSuccess(page);
});

test("10. Edición inválida: el modal no se cierra y explica qué corregir", async ({ page }) => {
  await openApp(page);
  await loadDemo(page);
  await goTab(page, "movimientos");

  await openFirstEdit(page);
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

  await presupuestos.getByRole("combobox", { name: "Categoría", exact: true }).click();
  await expect(page.getByRole("listbox", { name: "Categoría" }).getByRole("option", { name: categoria, exact: true })).toHaveCount(0);
  await expect(page.locator('[role="option"]:focus')).toHaveCount(1); // la hoja/menú ya movió el foco a sus opciones
  await page.keyboard.press("Escape");
  await expect(page.getByRole("listbox", { name: "Categoría" })).toBeHidden();

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
    await page.locator(`input[placeholder="$ 0.00"]:visible`).fill(monto);
    const saved = expectSave(page);
    await page.getByRole("button", { name: "Registrar", exact: true }).click();
    await saved;
    await expect(page.getByText(que).first()).toBeVisible();
  }

  await goTab(page, "analisis");
  const tarjeta = page.locator("section.pop-card").filter({ has: page.getByRole("heading", { name: "Distribución de gastos" }) });
  await expect(tarjeta.getByText("Aún no hay gastos este mes.")).toHaveCount(0);
  await expect(tarjeta.getByText("$350").first()).toBeVisible(); // total del mes
  await expect(tarjeta.locator(".hb")).not.toHaveCount(0);
});

test("14. Historial: un monto en cero va en tinta y sin signo", async ({ page }) => {
  await openApp(page);
  await loadDemo(page); // sin deudas: Gastos del snapshot = $0
  await page.locator("#save-snapshot-btn").click();
  await goTab(page, "historial");

  const gastos = page.locator("#history-section tbody tr").first().locator("td").nth(2);
  await expect(gastos).toHaveText("$0");
  await expect(gastos.locator("span")).toHaveClass(/text-foreground/);
  await expect(gastos.locator("span")).not.toHaveClass(/money-out/);
});

test.describe("15. Snapshot de noche", () => {
  // 21:30 del 6 de octubre en México = 03:30 UTC del 7: el día que se cortaba mal.
  test.use({ timezoneId: "America/Mexico_City" });

  test("el calendario del snapshot marca el mismo día que el encabezado", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-10-07T03:30:00Z"));
    await openApp(page);
    await page.locator("#save-snapshot-btn").click();
    await goTab(page, "historial");
    await page.locator("#history-section tbody tr").first().click();

    const modal = page.getByRole("dialog");
    await expect(modal.getByText("martes, 6 de octubre de 2026")).toBeVisible();
    await expect(modal.getByRole("button", { name: /6 de octubre de 2026.*seleccionad/i })).toBeVisible();
    await expect(modal.getByRole("button", { name: /7 de octubre de 2026.*seleccionad/i })).toHaveCount(0);
  });
});

test("16. Tendencia: con menos de 2 snapshots muestra el estado vacío", async ({ page }) => {
  await openApp(page);
  await loadDemo(page);
  await goTab(page, "analisis");
  const aviso = page.getByText("Guarda un snapshot más para ver tu tendencia");
  await expect(aviso).toBeVisible();

  await goTab(page, "inicio");
  await page.locator("#save-snapshot-btn").click(); // un solo snapshot sigue sin alcanzar
  await goTab(page, "analisis");
  await expect(aviso).toBeVisible();
});

test("17. Registro rápido: Agregar siempre activo, marca lo que falta y luego guarda", async ({ page }) => {
  await openApp(page);
  await page.getByRole("button", { name: "Agregar registro rápido" }).click();
  const modal = page.getByRole("dialog");
  const agregar = modal.getByRole("button", { name: "Agregar", exact: true });

  await expect(agregar).toBeEnabled();
  await agregar.click();
  await expect(modal).toBeVisible();
  await expect(modal.getByText("Dime en qué fue")).toBeVisible();
  await expect(modal.getByText("Escribe un monto mayor a 0")).toBeVisible();

  for (const k of ["2", "5", "0"]) await modal.getByRole("button", { name: k, exact: true }).click();
  await modal.getByLabel("¿En qué?").fill("Tacos E2E");
  await expect(modal.getByText("Dime en qué fue")).toHaveCount(0);
  const saved = expectSave(page);
  await agregar.click();
  await expect(modal).toBeHidden();
  await saved;
});

test("18. Héroe en móvil: con cifras largas el anillo y los botones caben dentro", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium-mobile", "El anillo cambia de lugar solo en ≤430px");
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  await loadDemo(page);
  await addAsset(page, "Cuenta grande E2E", 1234567.89);

  const hero = (await page.locator("#balance-card").boundingBox())!;
  const ring = (await page.locator("#balance-card .ring:visible").boundingBox())!;
  expect(ring.width).toBe(44);
  expect(ring.x + ring.width).toBeLessThanOrEqual(hero.x + hero.width - 12); // dentro, con margen
  const botones = page.locator("#balance-card .slab-btn");
  await expect(botones).toHaveCount(2);
  for (const b of await botones.all()) {
    const box = (await b.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(hero.x + hero.width - 12);
  }
});
