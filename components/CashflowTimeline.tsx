"use client";

import { useMemo } from "react";
import { CreditCard as CreditCardIcon, Repeat, ReceiptText, TrendingUp, TriangleAlert } from "lucide-react";
import { CreditCardItem, SubscriptionItem, InstallmentPlan, TransactionItem } from "@/types";
import { money } from "@/lib/format";
import { upcomingPayments } from "@/lib/finance-utils";

// ─────────────────────────────────────────────────────────────────
// Proyección de flujo: cómo va a quedar tu dinero después de cada
// pago de los próximos 45 días. Incluye tarjetas, gastos fijos, MSI
// y los gastos/ingresos planeados que registres con fecha futura.
// El saldo corre en cascada y se pinta rojo en el momento exacto en
// que te quedarías sin fondos.
// ─────────────────────────────────────────────────────────────────

const HORIZON_DAYS = 45;

type Row = {
  id: string;
  label: string;
  amount: number;        // positivo = sale dinero, negativo = entra dinero
  dueDate: Date;
  daysLeft: number;
  kind: "card" | "sub" | "planned" | "income";
  note?: string;
};

export default function CashflowTimeline({ cards, subscriptions, installments, startBalance, transactions = [] }: {
  cards: CreditCardItem[];
  subscriptions: SubscriptionItem[];
  installments: InstallmentPlan[];
  startBalance: number; // disponible bruto (activos − deudas − apartados)
  transactions?: TransactionItem[]; // para incluir gastos/ingresos planeados a futuro
}) {
  const rows = useMemo<Row[]>(() => {
    const base: Row[] = upcomingPayments(cards, subscriptions, HORIZON_DAYS, installments).map((e) => ({
      id: e.id,
      label: e.label,
      amount: e.amount,
      dueDate: e.dueDate,
      daysLeft: e.daysLeft,
      kind: e.kind === "card" ? "card" as const : "sub" as const,
      note: e.note,
    }));

    // Gastos/ingresos planeados con fecha futura (dentro del horizonte)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const limit = new Date(today);
    limit.setDate(limit.getDate() + HORIZON_DAYS);

    for (const t of transactions) {
      if (!t.date) continue;
      const [y, m, d] = t.date.split("-").map(Number);
      if (!y || !m || !d) continue;
      const when = new Date(y, m - 1, d);
      if (when <= today || when > limit) continue;
      const daysLeft = Math.round((when.getTime() - today.getTime()) / 86400000);
      if (t.type === "expense") {
        base.push({
          id: `plan-${t.id}`,
          label: t.label,
          amount: t.amount,
          dueDate: when,
          daysLeft,
          kind: "planned",
          note: "planeado",
        });
      } else {
        base.push({
          id: `inc-${t.id}`,
          label: t.label,
          amount: -t.amount, // negativo = suma al saldo
          dueDate: when,
          daysLeft,
          kind: "income",
          note: "ingreso",
        });
      }
    }

    base.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    return base;
  }, [cards, subscriptions, installments, transactions]);

  if (rows.length === 0) return null;

  // Saldo en cascada
  let running = startBalance;
  const withBalance = rows.map((e) => {
    running = Math.round((running - e.amount) * 100) / 100;
    return { ...e, after: running };
  });

  const endsNegative = withBalance[withBalance.length - 1].after < 0;
  const firstNegative = withBalance.find((r) => r.after < 0);
  const hasPlanned = rows.some((r) => r.kind === "planned" || r.kind === "income");

  const closing = withBalance[withBalance.length - 1].after;

  return (
    <section className="pop-card wide">
      <div className="sec-h">
        <h2 className="sec">Proyección de flujo a {HORIZON_DAYS} días</h2>
        <span className="chip tnum">{money(startBalance)} disponibles</span>
      </div>
      <p className="summary">
        Así queda tu saldo después de cada movimiento
        {hasPlanned && ". Incluye tus gastos e ingresos planeados"}.
      </p>

      {firstNegative && (
        <div className="callout warn flex items-start gap-2 mb-3">
          <TriangleAlert size={15} className="text-money-out-text shrink-0 mt-0.5" aria-hidden />
          <p>
            Te quedas en negativo el{" "}
            <b>{firstNegative.dueDate.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</b>{" "}
            con <b>{firstNegative.label}</b>. Necesitarás ingresos antes de esa fecha.
          </p>
        </div>
      )}

      <ol className="list">
        {withBalance.map((r) => {
          const negative = r.after < 0;
          const isIncome = r.kind === "income";
          return (
            <li key={r.id} className="it">
              <i aria-hidden>
                {r.kind === "card" ? <CreditCardIcon size={18} />
                  : r.kind === "planned" ? <ReceiptText size={18} />
                  : r.kind === "income" ? <TrendingUp size={18} />
                  : <Repeat size={18} />}
              </i>
              <div className="t">
                <b>{r.label}{r.note && <span className="mute text-[11px] font-semibold"> ({r.note})</span>}</b>
                <small>
                  {r.dueDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" })},{" "}
                  {r.daysLeft < 0 ? `venció hace ${Math.abs(r.daysLeft)} d` : r.daysLeft === 0 ? "hoy" : r.daysLeft === 1 ? "mañana" : `en ${r.daysLeft} d`}
                </small>
              </div>
              <div className="text-right shrink-0">
                <div className={`amt ${isIncome ? "text-money-in-text" : ""}`}>
                  {isIncome ? "+" : "−"}{money(Math.abs(r.amount))}
                </div>
                <small className={`text-[11px] font-bold tnum ${negative ? "text-money-out-text" : "mute"}`}>
                  Saldo {negative && "−"}{money(Math.abs(r.after))}
                </small>
              </div>
            </li>
          );
        })}
      </ol>

      <p className={`mt-4 text-xs font-semibold ${endsNegative ? "text-money-out-text" : "mute"}`}>
        {endsNegative
          ? `Al final de los ${HORIZON_DAYS} días quedarías en negativo: planea ingresos o recorta gastos.`
          : `Cierras los ${HORIZON_DAYS} días con ${money(closing)}${hasPlanned ? "." : ". No cuenta ingresos que recibas."}`}
      </p>
    </section>
  );
}
