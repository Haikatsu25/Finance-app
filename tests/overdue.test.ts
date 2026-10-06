// Pago vencido: la fecha límite de la tarjeta ya pasó y todavía hay saldo.
//
// Regla (sin registro de pagos, es la mejor que permiten los datos):
// un estado de cuenta vence en la primera fecha límite posterior a su corte.
// Si la fecha límite más reciente cayó DESPUÉS del último corte y ya pasó
// (estrictamente antes de hoy), ese estado de cuenta está vencido mientras
// la tarjeta siga con saldo. Al llegar el siguiente corte empieza otro ciclo.
import { describe, test, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { upcomingPayments } from "@/lib/finance-utils";
import { computeHealthScore, computeInsights, type FinanceData } from "@/lib/insights";
import type { CreditCardItem } from "@/types";

const card = (over: Partial<CreditCardItem> = {}): CreditCardItem => ({
  id: "c1", label: "Nu", balance: 4000, creditLimit: 20000, cutoffDay: 15, dueDay: 5, ...over,
});

const data = (cards: CreditCardItem[]): FinanceData => ({
  assets: [], liabilities: [], buckets: [], subscriptions: [], goals: [],
  transactions: [], creditCards: cards, installments: [], budgets: [],
});

/** Congela "hoy" a mediodía hora local (los helpers de fechas trabajan en local). */
const today = (y: number, m: number, d: number) =>
  mock.timers.enable({ apis: ["Date"], now: new Date(y, m - 1, d, 12) });

const cardPayment = (c: CreditCardItem) =>
  upcomingPayments([c], []).find((p) => p.id === `card-${c.id}`);

describe("la fecha límite de pago ya pasó este mes", () => {
  beforeEach(() => mock.timers.reset());
  afterEach(() => mock.timers.reset());

  test("corte 15 / pago 5, hoy 10 oct: vencido hace 5 días", () => {
    today(2026, 10, 10);
    const p = cardPayment(card());
    assert.ok(p, "la tarjeta con saldo debe aparecer");
    assert.equal(p.daysLeft, -5);
    assert.equal(p.urgency, "overdue");
    assert.equal(p.dueDate.getDate(), 5);
    assert.equal(p.dueDate.getMonth(), 9); // octubre
  });

  test("corte 25 / pago 15, hoy 20 oct: vencido hace 5 días (el pago cae después del corte)", () => {
    today(2026, 10, 20);
    const p = cardPayment(card({ cutoffDay: 25, dueDay: 15 }));
    assert.equal(p?.daysLeft, -5);
    assert.equal(p?.urgency, "overdue");
  });

  test("corte 10 / pago 25 en el mismo mes: antes del pago NO está vencido, al día siguiente sí", () => {
    const c = card({ cutoffDay: 10, dueDay: 25 });
    today(2026, 10, 12);
    assert.equal(cardPayment(c)?.daysLeft, 13);
    assert.equal(cardPayment(c)?.urgency, "ok");
    mock.timers.reset();
    today(2026, 10, 26);
    assert.equal(cardPayment(c)?.daysLeft, -1);
    assert.equal(cardPayment(c)?.urgency, "overdue");
  });

  test("después del siguiente corte empieza otro ciclo: ya no es vencido", () => {
    today(2026, 10, 20); // corte 15 ya ocurrió → el próximo pago es el 5 de nov
    const p = cardPayment(card());
    assert.equal(p?.daysLeft, 16);
    assert.notEqual(p?.urgency, "overdue");
  });

  test("el mismo día del límite no es vencido: vence HOY", () => {
    today(2026, 10, 5);
    const p = cardPayment(card());
    assert.equal(p?.daysLeft, 0);
    assert.equal(p?.urgency, "urgent");
  });

  test("antes del límite sigue contando hacia adelante", () => {
    today(2026, 10, 3);
    const p = cardPayment(card());
    assert.equal(p?.daysLeft, 2);
    assert.equal(p?.urgency, "urgent");
  });

  test("día 31 en febrero se ajusta a fin de mes (28) y cuenta como vencido 3 días después", () => {
    today(2027, 3, 3);
    const p = cardPayment(card({ cutoffDay: 20, dueDay: 31 }));
    assert.equal(p?.daysLeft, -3); // 28 feb → 3 mar
    assert.equal(p?.urgency, "overdue");
  });

  test("sin saldo no hay nada vencido", () => {
    today(2026, 10, 10);
    assert.equal(cardPayment(card({ balance: 0 })), undefined);
  });
});

describe("el mismo criterio alimenta el score y los avisos", () => {
  beforeEach(() => mock.timers.reset());
  afterEach(() => mock.timers.reset());

  test("score: resta 15 por 'Pagos vencidos' cuando hay una tarjeta vencida", () => {
    today(2026, 10, 10);
    const h = computeHealthScore(data([card()]));
    const f = h.factors.find((x) => x.label === "Pagos vencidos");
    assert.ok(f, "debe existir el factor");
    assert.equal(f.points, -15);
  });

  test("score: sin vencidos no aparece el factor", () => {
    today(2026, 10, 20);
    const h = computeHealthScore(data([card()]));
    assert.equal(h.factors.find((x) => x.label === "Pagos vencidos"), undefined);
  });

  test("insights: alerta de pago vencido con los días correctos", () => {
    today(2026, 10, 10);
    const i = computeInsights(data([card()])).find((x) => x.id === "over-c1");
    assert.ok(i, "debe emitir la alerta");
    assert.equal(i.severity, "alert");
    assert.match(i.detail, /5 días/);
  });

  test("insights: no emite vencido ni 'pagas en' fuera de la ventana", () => {
    today(2026, 10, 20);
    const ids = computeInsights(data([card()])).map((x) => x.id);
    assert.ok(!ids.includes("over-c1"));
    assert.ok(!ids.includes("due-c1"));
  });
});
