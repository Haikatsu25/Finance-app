// "Vencido" = la fecha límite del estado de cuenta ya pasó Y no está marcado
// como pagado. El botón "Pagado" escribe en la tarjeta la fecha límite del
// ciclo que cubre (lastPaidCycle, YYYY-MM-DD); un ciclo pagado deja de contar.
import { describe, test, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { upcomingPayments } from "@/lib/finance-utils";
import { computeHealthScore, computeInsights, type FinanceData } from "@/lib/insights";
import type { CreditCardItem, InstallmentPlan } from "@/types";

// corte 15 / pago 5: el estado que cortó el 15 de sep vence el 5 de oct
const card = (over: Partial<CreditCardItem> = {}): CreditCardItem => ({
  id: "c1", label: "Nu", balance: 4000, creditLimit: 20000, cutoffDay: 15, dueDay: 5, ...over,
});

const data = (cards: CreditCardItem[], installments: InstallmentPlan[] = []): FinanceData => ({
  assets: [], liabilities: [], buckets: [], subscriptions: [], goals: [],
  transactions: [], creditCards: cards, installments, budgets: [],
});

const today = (y: number, m: number, d: number) =>
  mock.timers.enable({ apis: ["Date"], now: new Date(y, m - 1, d, 12) });

const payment = (c: CreditCardItem, inst: InstallmentPlan[] = []) =>
  upcomingPayments([c], [], 30, inst).find((p) => p.id === `card-${c.id}`);

const hasFactor = (c: CreditCardItem, inst: InstallmentPlan[] = []) =>
  computeHealthScore(data([c], inst)).factors.some((f) => f.label === "Pagos vencidos");

const insightIds = (c: CreditCardItem) => computeInsights(data([c])).map((i) => i.id);

describe("pasó la fecha pero ya pagué", () => {
  beforeEach(() => mock.timers.reset());
  afterEach(() => mock.timers.reset());

  test("ciclo pagado: no hay vencido y el siguiente pago es el del mes que viene", () => {
    today(2026, 10, 10); // el 5 de oct ya pasó; el saldo ya incluye compras nuevas
    const c = card({ lastPaidCycle: "2026-10-05" });
    const p = payment(c);
    assert.ok(p, "sigue mostrando lo que viene");
    assert.equal(p.dueDate.getMonth(), 10); // noviembre
    assert.equal(p.dueDate.getDate(), 5);
    assert.equal(p.daysLeft, 26);
    assert.notEqual(p.urgency, "overdue");
  });

  test("ciclo pagado: ni el score ni los insights lo marcan vencido", () => {
    today(2026, 10, 10);
    const c = card({ lastPaidCycle: "2026-10-05" });
    assert.equal(hasFactor(c), false);
    assert.ok(!insightIds(c).includes("over-c1"));
  });

  test("pagado por adelantado (antes del límite): no avisa 'pagas en 2 días'", () => {
    today(2026, 10, 3);
    const c = card({ lastPaidCycle: "2026-10-05" });
    assert.equal(payment(c), undefined, "el pago de nov queda fuera del horizonte de 30 días");
    assert.ok(!insightIds(c).includes("due-c1"));
  });

  test("un pago de un ciclo anterior no cubre el vencido de este", () => {
    today(2026, 10, 10);
    const c = card({ lastPaidCycle: "2026-09-05" });
    assert.equal(payment(c)?.daysLeft, -5);
    assert.equal(payment(c)?.urgency, "overdue");
    assert.equal(hasFactor(c), true);
  });

  test("tras el siguiente corte el ciclo pagado queda atrás y el nuevo cuenta hacia adelante", () => {
    today(2026, 10, 20);
    const p = payment(card({ lastPaidCycle: "2026-10-05" }));
    assert.equal(p?.daysLeft, 16);
    assert.notEqual(p?.urgency, "overdue");
  });

  test("si no marcas el ciclo siguiente, vence aunque pagaras el anterior", () => {
    today(2026, 11, 6); // corte 15 oct ya pasó; el 5 de nov también
    const c = card({ lastPaidCycle: "2026-10-05" });
    assert.equal(payment(c)?.daysLeft, -1);
    assert.equal(payment(c)?.urgency, "overdue");
  });

  test("un lastPaidCycle inválido se ignora (sigue vencido)", () => {
    today(2026, 10, 10);
    assert.equal(payment(card({ lastPaidCycle: "basura" }))?.urgency, "overdue");
    assert.equal(payment(card({ lastPaidCycle: "2026-13-45" }))?.urgency, "overdue");
  });

  test("tarjeta sin deuda de contado pero con MSI: vencida si no está pagada, no vencida si sí", () => {
    today(2026, 10, 10);
    const msi: InstallmentPlan[] = [
      { id: "i1", cardId: "c1", label: "Laptop", totalAmount: 12000, months: 12, startDate: "2026-08-01" },
    ];
    const unpaid = card({ balance: 0 });
    assert.equal(payment(unpaid, msi)?.urgency, "overdue");
    assert.equal(hasFactor(unpaid, msi), true);

    const paid = card({ balance: 0, lastPaidCycle: "2026-10-05" });
    assert.notEqual(payment(paid, msi)?.urgency, "overdue");
    assert.equal(hasFactor(paid, msi), false);
  });
});
