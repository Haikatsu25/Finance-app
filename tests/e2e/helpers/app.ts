import { expect, type Locator, type Page } from "@playwright/test";

/** Entra a la app con sesión y espera a que cargue el saldo principal. */
export async function openApp(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#balance-card")).toBeVisible({ timeout: 90_000 });
}

export type Tab = "inicio" | "movimientos" | "analisis" | "ia" | "historial";

// La barra superior (escritorio) y la inferior (móvil) usan etiquetas distintas; solo una es visible.
const TAB_LABELS: Record<Tab, RegExp> = {
  inicio: /^Inicio$/,
  movimientos: /^(Movimientos|Movs)$/,
  analisis: /^Análisis$/,
  ia: /^(FinanceAI|IA)$/,
  historial: /^Historial$/,
};

export async function goTab(page: Page, tab: Tab) {
  await page.getByRole("button", { name: TAB_LABELS[tab] }).click();
  await page.waitForTimeout(400);
}

/** Tarjeta de un panel de Inicio localizada por su título (h3). */
export function panel(page: Page, title: string | RegExp): Locator {
  const h3 = typeof title === "string" ? `normalize-space()="${title}"` : null;
  return h3
    ? page.locator(`xpath=//h3[${h3}]/ancestor::div[contains(@class,"glass")][1]`)
    : page.locator("div.glass").filter({ has: page.getByRole("heading", { name: title }) }).first();
}

/** Cara de una tarjeta de crédito por su nombre. */
export function cardFace(page: Page, label: string): Locator {
  return page.locator(".card-face").filter({ hasText: label });
}

/** Espera a que el autoguardado (POST /api/finance) termine bien. Llamar ANTES de la acción. */
export function expectSave(page: Page) {
  return page.waitForResponse(
    (r) => new URL(r.url()).pathname === "/api/finance" && r.request().method() === "POST" && r.ok(),
    { timeout: 30_000 },
  );
}

export async function loadDemo(page: Page) {
  await page.getByRole("button", { name: "Cargar datos de ejemplo" }).click();
  await expect(cardFace(page, "Nu (ejemplo)")).toBeVisible();
}

export async function addAsset(page: Page, label: string, amount: number) {
  const card = panel(page, "Ingresos & Activos");
  await card.getByPlaceholder("Descripción").fill(label);
  await card.getByPlaceholder("0.00").fill(String(amount));
  await card.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(card.getByText(label)).toBeVisible();
}

/**
 * Día de pago ya pasado este mes (plan: día 1). Si hoy ES el día 1 no estaría vencido, así que
 * ese único día se usa el 28 (de este ciclo, ya pasado el corte del 15).
 */
export function overdueDays(today = new Date()) {
  return { due: today.getDate() > 1 ? 1 : 28, cut: 15 };
}

export async function addCard(page: Page, c: { label: string; balance: number; limit: number; cut: number; due: number }) {
  await page.getByRole("button", { name: "Agregar tarjeta" }).click();
  const modal = page.getByRole("dialog");
  await modal.getByLabel("Nombre").fill(c.label);
  await modal.getByLabel("Deuda de contado").fill(String(c.balance));
  await modal.getByLabel("Límite de crédito").fill(String(c.limit));
  await modal.getByLabel("Día de corte").fill(String(c.cut));
  await modal.getByLabel("Día límite de pago").fill(String(c.due));
  await modal.getByRole("button", { name: "Guardar tarjeta" }).click();
  await expect(cardFace(page, c.label)).toBeVisible();
}

/** Cuenta con saldo (para que el score no tenga otras penalizaciones) y una tarjeta con el pago vencido. */
export async function seedOverdueCard(page: Page, label = "BBVA E2E") {
  await openApp(page);
  await addAsset(page, "Cuenta E2E", 50000);
  const { due, cut } = overdueDays();
  await addCard(page, { label, balance: 1000, limit: 20000, cut, due });
  await expect(cardFace(page, label).getByText(/Pago vencido hace/)).toBeVisible();
}

/** Pulsa "Pagado" en una tarjeta y confirma el modal; devuelve el texto del modal. */
export async function payCard(page: Page, label: string): Promise<string> {
  await cardFace(page, label).getByRole("button", { name: "Pagado" }).click();
  const modal = page.getByRole("dialog");
  await expect(modal.getByText("Marcar como pagada")).toBeVisible();
  const text = (await modal.innerText()).replace(/\s+/g, " ");
  await modal.getByRole("button", { name: "Sí, ya pagué" }).click();
  await expect(modal).toBeHidden();
  return text;
}

// ── Comprobaciones del recorrido visual ───────────────────────────────

/**
 * Elementos que se desbordan de su caja SIN ser un contenedor con scroll o recorte (overflow-x
 * visible). Los contenedores con overflow auto/scroll/hidden son desbordes intencionales (tablas,
 * listas deslizables, texto con puntos suspensivos) y no cuentan. También se revisa la página entera.
 */
export async function findOverflow(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const doc = document.documentElement;
    if (doc.scrollWidth > doc.clientWidth) out.push(`PÁGINA scrollWidth ${doc.scrollWidth} > clientWidth ${doc.clientWidth}`);
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      if (el.clientWidth <= 1 || el.scrollWidth <= el.clientWidth + 1) continue; // 1px = oculto solo para lectores
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (/(auto|scroll|hidden|clip)/.test(cs.overflowX)) continue;
      if (el.closest("[inert], [aria-hidden='true']")) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      // alineaciones con margen negativo que siguen dentro del relleno del contenedor no son desborde
      const pr = el.parentElement?.getBoundingClientRect();
      if (pr && r.left + el.scrollWidth <= pr.right + 1) continue;
      out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)} sw=${el.scrollWidth} cw=${el.clientWidth} "${(el.textContent || "").trim().slice(0, 30)}"`);
    }
    return out.slice(0, 12);
  });
}

/**
 * Botones visibles que miden menos de 36x36, y botones de acción principal (relleno sólido) con
 * menos de 44x44. "Acción principal" = botón sólido primario de HeroUI, botón relleno de la losa
 * o el FAB.
 */
export async function findSmallButtons(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const name = (el: Element) => ((el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ")).slice(0, 36);
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("button, [role=button]"))) {
      if (!(el as any).checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      if (el.closest("[inert], [aria-hidden='true']")) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const w = Math.round(r.width), h = Math.round(r.height);
      if (w <= 1 && h <= 1) continue; // botón "Descartar" de HeroUI, solo para lectores de pantalla
      const principal = /(^|\s)(bg-primary|bg-foreground|fab)(\s|$)/.test(el.className) || el.getAttribute("data-solid") === "true";
      if (w < 36 || h < 36) out.push(`${name(el)} ${w}x${h}`);
      else if (principal && (w < 44 || h < 44)) out.push(`[principal] ${name(el)} ${w}x${h}`);
    }
    return out.slice(0, 15);
  });
}
