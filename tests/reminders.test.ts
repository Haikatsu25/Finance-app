// Recordatorios del cron: no se avisa de pagar lo que ya está pagado, y un
// pago vencido y sin marcar se avisa UNA vez, al día siguiente.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildReminders } from "@/lib/reminders";

const card = (over: Record<string, unknown> = {}) => ({
  id: "c1", label: "Nu", balance: 4000, creditLimit: 20000, cutoffDay: 15, dueDay: 5, ...over,
});
const at = (m: number, d: number) => new Date(2026, m - 1, d, 12);
const titles = (cards: object[], now: Date) => buildReminders(cards, [], now).map((r) => r.title);

describe("recordatorios de pago", () => {
  test("3 días antes avisa; si el ciclo ya está pagado, no", () => {
    assert.ok(titles([card()], at(10, 2)).some((t) => /pago en 3 días/.test(t)));
    assert.equal(titles([card({ lastPaidCycle: "2026-10-05" })], at(10, 2)).filter((t) => /pago|vence/i.test(t)).length, 0);
  });

  test("el día del límite avisa 'vence HOY'; pagado, no", () => {
    assert.ok(titles([card()], at(10, 5)).some((t) => /vence HOY/.test(t)));
    assert.equal(titles([card({ lastPaidCycle: "2026-10-05" })], at(10, 5)).filter((t) => /vence HOY/.test(t)).length, 0);
  });

  test("un día después sin pagar avisa vencido, con la pista de tocar Pagado", () => {
    const r = buildReminders([card()], [], at(10, 6));
    const v = r.find((x) => /vencido/i.test(x.title));
    assert.ok(v, "debe avisar el vencido");
    assert.match(v.body, /Pagado/);
  });

  test("el vencido se avisa una sola vez (no a diario)", () => {
    assert.equal(titles([card()], at(10, 7)).filter((t) => /vencido/i.test(t)).length, 0);
    assert.equal(titles([card()], at(10, 9)).filter((t) => /vencido/i.test(t)).length, 0);
  });

  test("vencido pero marcado como pagado: no avisa", () => {
    assert.equal(titles([card({ lastPaidCycle: "2026-10-05" })], at(10, 6)).filter((t) => /vencido/i.test(t)).length, 0);
  });

  test("sin deuda no hay recordatorio de pago", () => {
    assert.equal(titles([card({ balance: 0 })], at(10, 6)).length, 0);
  });

  test("los avisos de corte no dependen del pago", () => {
    assert.ok(titles([card({ lastPaidCycle: "2026-10-05" })], at(10, 14)).some((t) => /corte MAÑANA/.test(t)));
  });
});
