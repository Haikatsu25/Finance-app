"use client";

import { useMemo } from "react";
import { Card, CardBody } from "@heroui/react";
import { CalendarRange, CreditCard as CreditCardIcon, Repeat, AlertTriangle, ReceiptText, TrendingUp } from "lucide-react";
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
    <Card className="glass card-hover rule-ink shadow-none">
      <CardBody className="p-5">
        <div className="mb-1">
          <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
            <CalendarRange size={16} className="shrink-0" aria-hidden />
            Proyección de flujo a {HORIZON_DAYS} días
          </h3>
          <p className="text-xs text-default-600 mt-0.5">
            Empiezas con <span className="font-bold tnum text-foreground">{money(startBalance)}</span> disponibles;
            así queda tu saldo después de cada movimiento
            {hasPlanned && <>. Incluye tus gastos e ingresos planeados</>}
          </p>
        </div>

        {firstNegative && (
          <div className="mt-2 mb-1 p-3 rounded-lg bg-money-out/10 border border-money-out/30 flex items-start gap-2">
            <AlertTriangle size={14} className="text-money-out-text shrink-0 mt-0.5" aria-hidden />
            <p className="text-xs text-default-700">
              Te quedas en negativo el{" "}
              <span className="font-bold">{firstNegative.dueDate.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</span>{" "}
              con <span className="font-bold">{firstNegative.label}</span>. Necesitarás ingresos antes de esa fecha.
            </p>
          </div>
        )}

        <div className="mt-3 relative">
          {/* línea vertical */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-default-300" aria-hidden />
          <ol className="space-y-3">
            {withBalance.map((r) => {
              const negative = r.after < 0;
              const isIncome = r.kind === "income";
              return (
                <li key={r.id} className="flex items-center gap-2 sm:gap-3 relative">
                  {/* Marca: relleno de salida si el saldo se va a negativo, de entrada si es un ingreso */}
                  <span className={`w-[15px] h-[15px] rounded-full border-2 shrink-0 z-10 ${
                    negative ? "bg-money-out border-money-out"
                    : isIncome ? "bg-money-in border-money-in"
                    : "bg-background border-default-400"
                  }`} aria-hidden />
                  <div className="w-[58px] sm:w-[78px] shrink-0">
                    <p className="text-xs font-bold leading-tight">
                      {r.dueDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    </p>
                    <p className="text-[11px] text-default-600">
                      {r.daysLeft < 0 ? `venció hace ${Math.abs(r.daysLeft)} d` : r.daysLeft === 0 ? "hoy" : r.daysLeft === 1 ? "mañana" : `en ${r.daysLeft} d`}
                    </p>
                  </div>
                  {/* En pantallas chicas el concepto va arriba y los montos abajo:
                      en una sola linea se encimaban con textos largos o fuente grande. */}
                  <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3">
                    <div className="flex items-center gap-1.5 min-w-0 sm:flex-1">
                      {r.kind === "card" ? <CreditCardIcon size={13} className="text-default-600 shrink-0" aria-hidden />
                        : r.kind === "planned" ? <ReceiptText size={13} className="text-default-600 shrink-0" aria-hidden />
                        : r.kind === "income" ? <TrendingUp size={13} className="text-money-in-text shrink-0" aria-hidden />
                        : <Repeat size={13} className="text-default-600 shrink-0" aria-hidden />}
                      <span className="text-sm font-semibold truncate">{r.label}</span>
                      {r.note && <span className="text-[11px] text-default-600 shrink-0">({r.note})</span>}
                    </div>
                    <div className="flex items-baseline justify-between sm:justify-end gap-2 sm:gap-4 shrink-0">
                      {/* La fila es neutra: solo el ingreso lleva color. El saldo que corre es un agregado: rojo si es negativo. */}
                      <span className={`figure text-[1.15rem] whitespace-nowrap ${isIncome ? "text-money-in-text" : ""}`}>
                        {isIncome ? "+" : "−"}{money(Math.abs(r.amount))}
                      </span>
                      <span className={`figure text-[1.3rem] whitespace-nowrap sm:w-[96px] text-right ${negative ? "text-money-out-text" : ""}`}>
                        {negative && "−"}{money(Math.abs(r.after))}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <p className={`mt-4 text-xs font-semibold ${endsNegative ? "text-money-out-text" : "text-default-600"}`}>
          {endsNegative
            ? `Al final de los ${HORIZON_DAYS} días quedarías en negativo: planea ingresos o recorta gastos.`
            : `Cierras los ${HORIZON_DAYS} días con ${money(closing)}${hasPlanned ? "." : ". No cuenta ingresos que recibas."}`}
        </p>
      </CardBody>
    </Card>
  );
}
