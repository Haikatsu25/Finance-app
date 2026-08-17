"use client";

import React, { useMemo } from "react";
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

  return (
    <Card className="glass card-hover border border-cyan-500/20">
      <CardBody className="p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 rounded-xl bg-cyan-500/12">
            <CalendarRange size={16} className="text-cyan-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Proyección de flujo — próximos {HORIZON_DAYS} días</h3>
            <p className="text-[11px] text-default-400">
              Empiezas con <span className="font-bold tnum text-default-600">{money(startBalance)}</span> disponibles;
              así queda tu saldo después de cada movimiento
              {hasPlanned && <> — incluye tus gastos e ingresos planeados</>}
            </p>
          </div>
        </div>

        {firstNegative && (
          <div className="mt-2 mb-1 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2">
            <AlertTriangle size={14} className="text-rose-500 shrink-0" />
            <p className="text-[11px] text-default-600">
              Te quedas en negativo el{" "}
              <span className="font-bold">{firstNegative.dueDate.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</span>{" "}
              con <span className="font-bold">{firstNegative.label}</span> — necesitarás ingresos antes de esa fecha.
            </p>
          </div>
        )}

        <div className="mt-3 relative">
          {/* línea vertical */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-default-200/60" />
          <div className="space-y-2.5">
            {withBalance.map((r) => {
              const negative = r.after < 0;
              const isIncome = r.kind === "income";
              return (
                <div key={r.id} className="flex items-center gap-3 relative">
                  <span className={`w-[15px] h-[15px] rounded-full border-2 shrink-0 z-10 ${
                    negative ? "bg-rose-500 border-rose-300/50"
                    : isIncome ? "bg-emerald-500 border-emerald-300/50"
                    : "bg-default-100 border-default-300"
                  }`} />
                  <div className="w-[74px] shrink-0">
                    <p className="text-[11px] font-bold text-default-600 capitalize leading-tight">
                      {r.dueDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                    </p>
                    <p className="text-[9px] text-default-400">
                      {r.daysLeft === 0 ? "hoy" : r.daysLeft === 1 ? "mañana" : `en ${r.daysLeft}d`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {r.kind === "card" ? <CreditCardIcon size={12} className="text-default-400 shrink-0" />
                      : r.kind === "planned" ? <ReceiptText size={12} className="text-cyan-500 shrink-0" />
                      : r.kind === "income" ? <TrendingUp size={12} className="text-emerald-500 shrink-0" />
                      : <Repeat size={12} className="text-default-400 shrink-0" />}
                    <span className="text-xs font-semibold text-default-700 truncate">{r.label}</span>
                    {r.note && (
                      <span className={`text-[8px] font-bold uppercase shrink-0 ${
                        isIncome ? "text-emerald-500" : r.kind === "planned" ? "text-cyan-500" : "text-indigo-500"
                      }`}>{r.note}</span>
                    )}
                  </div>
                  <span className={`tnum text-xs font-bold shrink-0 ${isIncome ? "text-emerald-500" : "text-rose-500"}`}>
                    {isIncome ? "+" : "−"}{money(Math.abs(r.amount))}
                  </span>
                  <span className={`tnum text-xs font-black shrink-0 w-[86px] text-right ${
                    negative ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"
                  }`}>
                    {negative && "−"}{money(Math.abs(r.after))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <p className={`mt-3 text-[11px] font-semibold ${endsNegative ? "text-rose-500" : "text-default-400"}`}>
          {endsNegative
            ? `Al final de los ${HORIZON_DAYS} días quedarías en negativo — planea ingresos o recorta gastos.`
            : `Cierras los ${HORIZON_DAYS} días con ${money(withBalance[withBalance.length - 1].after)}${hasPlanned ? "" : " — sin contar ingresos que recibas"}.`}
        </p>
      </CardBody>
    </Card>
  );
}
