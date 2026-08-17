"use client";

import React, { useMemo } from "react";
import { Card, CardBody } from "@heroui/react";
import { CalendarRange, CreditCard as CreditCardIcon, Repeat, AlertTriangle } from "lucide-react";
import { CreditCardItem, SubscriptionItem, InstallmentPlan } from "@/types";
import { money } from "@/lib/format";
import { upcomingPayments } from "@/lib/finance-utils";

// ─────────────────────────────────────────────────────────────────
// Proyección de flujo: cómo va a quedar tu dinero después de cada
// pago de los próximos 30 días. El saldo corre en cascada y se pinta
// rojo en el momento exacto en que te quedarías sin fondos.
// ─────────────────────────────────────────────────────────────────

export default function CashflowTimeline({ cards, subscriptions, installments, startBalance }: {
  cards: CreditCardItem[];
  subscriptions: SubscriptionItem[];
  installments: InstallmentPlan[];
  startBalance: number; // disponible bruto (activos − deudas − apartados)
}) {
  const events = useMemo(
    () => upcomingPayments(cards, subscriptions, 30, installments),
    [cards, subscriptions, installments],
  );

  if (events.length === 0) return null;

  // Saldo en cascada
  let running = startBalance;
  const rows = events.map((e) => {
    running = Math.round((running - e.amount) * 100) / 100;
    return { ...e, after: running };
  });

  const endsNegative = rows[rows.length - 1].after < 0;
  const firstNegative = rows.find((r) => r.after < 0);

  return (
    <Card className="glass card-hover border border-cyan-500/20">
      <CardBody className="p-5">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 rounded-xl bg-cyan-500/12">
            <CalendarRange size={16} className="text-cyan-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Proyección de flujo — próximos 30 días</h3>
            <p className="text-[11px] text-default-400">
              Empiezas con <span className="font-bold tnum text-default-600">{money(startBalance)}</span> disponibles;
              así queda tu saldo después de cada pago
            </p>
          </div>
        </div>

        {firstNegative && (
          <div className="mt-2 mb-1 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2">
            <AlertTriangle size={14} className="text-rose-500 shrink-0" />
            <p className="text-[11px] text-default-600">
              Te quedas en negativo el{" "}
              <span className="font-bold">{firstNegative.dueDate.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</span>{" "}
              con el pago de <span className="font-bold">{firstNegative.label}</span> — necesitarás ingresos antes de esa fecha.
            </p>
          </div>
        )}

        <div className="mt-3 relative">
          {/* línea vertical */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-default-200/60" />
          <div className="space-y-2.5">
            {rows.map((r) => {
              const negative = r.after < 0;
              return (
                <div key={r.id} className="flex items-center gap-3 relative">
                  <span className={`w-[15px] h-[15px] rounded-full border-2 shrink-0 z-10 ${
                    negative ? "bg-rose-500 border-rose-300/50" : "bg-default-100 border-default-300"
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
                    {r.kind === "card"
                      ? <CreditCardIcon size={12} className="text-default-400 shrink-0" />
                      : <Repeat size={12} className="text-default-400 shrink-0" />}
                    <span className="text-xs font-semibold text-default-700 truncate">{r.label}</span>
                    {r.note && (
                      <span className="text-[8px] font-bold uppercase text-indigo-500 shrink-0">{r.note}</span>
                    )}
                  </div>
                  <span className="tnum text-xs font-bold text-rose-500 shrink-0">−{money(r.amount)}</span>
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
            ? "Al final de los 30 días quedarías en negativo — planea ingresos o recorta gastos."
            : `Cierras los 30 días con ${money(rows[rows.length - 1].after)} — sin contar ingresos que recibas.`}
        </p>
      </CardBody>
    </Card>
  );
}
