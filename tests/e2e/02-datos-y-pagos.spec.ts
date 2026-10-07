import { test, expect } from "./fixtures";
import {
  cardFace, expectSave, goTab, loadDemo, openApp, overdueDays, panel, payCard, seedOverdueCard,
} from "./helpers/app";
import { readFinance } from "./helpers/db";

const CARD = "BBVA E2E";

/** Fecha límite (YYYY-MM-DD) del ciclo que debe quedar guardado: la del día de pago ya pasado. */
function expectedCycle(today = new Date()): string {
  const { due } = overdueDays(today);
  const d = new Date(today.getFullYear(), today.getMonth() - (today.getDate() > 1 ? 0 : 1), due);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

test("3. Datos de ejemplo: aparecen activos, la tarjeta Nu (ejemplo) y presupuestos", async ({ page, watch }) => {
  await openApp(page);
  await loadDemo(page);

  const activos = panel(page, "Ingresos y activos");
  await expect(activos.getByText("BBVA Débito (ejemplo)")).toBeVisible();
  await expect(activos.getByText("Efectivo (ejemplo)")).toBeVisible();
  await expect(cardFace(page, "Nu (ejemplo)")).toBeVisible();
  // el ciclo de la tarjeta de ejemplo es relativo a hoy: nunca arranca vencida
  await expect(cardFace(page, "Nu (ejemplo)").getByText(/Pago vencido/)).toHaveCount(0);
  await expect(cardFace(page, "Nu (ejemplo)").getByText(/Pagas el \d{1,2} \p{L}+, en \d+ días/u)).toBeVisible();
  await expect(page.getByText(/Venció hace/)).toHaveCount(0);
  const presupuestos = panel(page, "Presupuestos del mes");
  await expect(presupuestos.getByText("Comida", { exact: true })).toBeVisible();
  await expect(presupuestos.getByText("Transporte", { exact: true })).toBeVisible();
  expect(watch.consoleErrors).toEqual([]);
});

test("4. Pago vencido: en la tarjeta, en Por pagar, en el score y en los hallazgos de IA", async ({ page }) => {
  await seedOverdueCard(page, CARD);

  await expect(cardFace(page, CARD).getByText(/Pago vencido hace \d+ días?/)).toBeVisible();
  const porPagar = panel(page, "Por pagar");
  await expect(porPagar.getByText(CARD)).toBeVisible();
  await expect(porPagar.getByText(/Venció hace \d+ días?/)).toBeVisible();

  await goTab(page, "ia");
  await expect(page.getByText("Pagos vencidos", { exact: true })).toBeVisible();
  await expect(page.getByText("−15", { exact: true })).toBeVisible();
  await expect(page.getByText(`${CARD}: pago VENCIDO`)).toBeVisible();
});

test("5. Pagado: el modal dice qué ciclo se marca y desaparece el vencido en todas partes", async ({ page }) => {
  await seedOverdueCard(page, CARD);
  const modalText = await payCard(page, CARD);
  expect(modalText).toMatch(/Se marcará como pagado el estado de cuenta que vence el \d{1,2} de \p{L}+/u);

  await expect(page.getByText(/Marcaste pagado el ciclo del \d{1,2} \p{L}+/u)).toBeVisible();
  await expect(cardFace(page, CARD).getByText(/Pago vencido/)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Por pagar" })).toHaveCount(0);

  await goTab(page, "ia");
  await expect(page.getByText("Pagos vencidos", { exact: true })).toHaveCount(0);
  await expect(page.getByText(`${CARD}: pago VENCIDO`)).toHaveCount(0);
});

test("6. Deshacer: dentro de la ventana del aviso vuelve el vencido", async ({ page }) => {
  await seedOverdueCard(page, CARD);
  await payCard(page, CARD);
  await expect(cardFace(page, CARD).getByText(/Pago vencido/)).toHaveCount(0);

  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(cardFace(page, CARD).getByText(/Pago vencido hace/)).toBeVisible();
  await expect(cardFace(page, CARD).getByText("$1,000").first()).toBeVisible();
});

test("7. Persistencia: tras recargar sigue sin vencido y la API devuelve lastPaidCycle", async ({ page }) => {
  await seedOverdueCard(page, CARD);
  // el guardado que importa es el que lleva lastPaidCycle (hay otros POST por las altas anteriores)
  const saved = page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/finance" && r.request().method() === "POST" && r.ok()
      && (r.request().postData() ?? "").includes('"lastPaidCycle"'),
    { timeout: 30_000 },
  );
  await payCard(page, CARD);
  await saved;

  const [reloaded] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname === "/api/finance" && r.request().method() === "GET"),
    page.reload(),
  ]);
  const json = await reloaded.json();
  const card = json.creditCards.find((c: any) => c.label === CARD);
  expect(card.lastPaidCycle).toBe(expectedCycle());

  await expect(page.locator("#balance-card")).toBeVisible();
  await expect(cardFace(page, CARD).getByText(/Pago vencido/)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Por pagar" })).toHaveCount(0);

  // y quedó en la base (finance-test), no solo en la respuesta
  const doc = await readFinance();
  expect(doc.creditCards.find((c: any) => c.label === CARD).lastPaidCycle).toBe(expectedCycle());
});

test("8. Saldo nuevo tras pagar: no vuelve a aparecer vencido y la tarjeta muestra la próxima fecha", async ({ page }) => {
  await seedOverdueCard(page, CARD);
  await payCard(page, CARD);

  const face = cardFace(page, CARD);
  await face.getByLabel("Reemplazar deuda de contado").fill("800");
  const saved = expectSave(page);
  await face.getByRole("button", { name: "Guardar nueva deuda" }).click();
  await saved;

  await expect(face.getByText("$800").first()).toBeVisible();
  await expect(face.getByText(/Pago vencido/)).toHaveCount(0);
  await expect(face.getByText(/Pagas el \d{1,2} \p{L}+, en \d+ días/u)).toBeVisible();
});
