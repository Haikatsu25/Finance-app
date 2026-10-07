import { test, expect } from "./fixtures";
import { openApp } from "./helpers/app";

test.describe("1. Carga con sesión", () => {
  test("un solo GET /api/finance con 200, ningún 401 y la consola limpia", async ({ page, watch }) => {
    await openApp(page);
    await page.waitForTimeout(3_000); // margen para peticiones tardías (reintentos, doble montaje)

    const gets = watch.finance.filter((c) => c.method === "GET");
    expect(gets, `GET /api/finance: ${JSON.stringify(watch.finance)}`).toHaveLength(1);
    expect(gets[0].status).toBe(200);
    expect(watch.finance.filter((c) => c.status === 401), "ninguna respuesta 401").toEqual([]);
    expect(watch.consoleErrors, "errores de consola").toEqual([]);
  });
});

test.describe("2. Sin sesión", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("la pantalla de entrada no hace ninguna petición a /api/finance", async ({ page, watch }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Iniciar sesión" }).first()).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(4_000);

    expect(watch.finance, "peticiones a /api/finance sin sesión").toEqual([]);
    await expect(page.getByText("No pudimos cargar tus datos")).toHaveCount(0);
    expect(watch.consoleErrors, "errores de consola").toEqual([]);
  });
});
