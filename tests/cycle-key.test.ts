// La clave de ciclo es lo que escribe el botón "Pagado": la fecha límite del
// estado de cuenta que se está pagando, en YYYY-MM-DD local.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { cycleKey, isoDate } from "@/lib/finance-utils";
import type { CreditCardItem } from "@/types";

const card = (over: Partial<CreditCardItem> = {}): CreditCardItem => ({
  id: "c1", label: "Nu", balance: 4000, creditLimit: 20000, cutoffDay: 15, dueDay: 5, ...over,
});

describe("isoDate", () => {
  test("usa la fecha LOCAL, no la UTC", () => {
    assert.equal(isoDate(new Date(2026, 0, 5, 23, 30)), "2026-01-05");
    assert.equal(isoDate(new Date(2026, 11, 31, 0, 5)), "2026-12-31");
  });
});

describe("cycleKey", () => {
  test("con el pago ya pasado (ventana de vencido) es la fecha límite que pasó", () => {
    assert.equal(cycleKey(card(), new Date(2026, 9, 10, 12)), "2026-10-05");
  });

  test("antes del límite es la próxima fecha límite", () => {
    assert.equal(cycleKey(card(), new Date(2026, 9, 3, 12)), "2026-10-05");
  });

  test("después del siguiente corte es la del mes siguiente", () => {
    assert.equal(cycleKey(card(), new Date(2026, 9, 20, 12)), "2026-11-05");
  });

  test("ignora lastPaidCycle: volver a marcar el mismo ciclo no lo adelanta", () => {
    const paid = card({ lastPaidCycle: "2026-10-05" });
    assert.equal(cycleKey(paid, new Date(2026, 9, 3, 12)), "2026-10-05");
    assert.equal(cycleKey(paid, new Date(2026, 9, 10, 12)), "2026-10-05");
  });

  test("día 31 en un mes corto se ajusta a fin de mes", () => {
    assert.equal(cycleKey(card({ cutoffDay: 20, dueDay: 31 }), new Date(2027, 2, 3, 12)), "2027-02-28");
  });
});
