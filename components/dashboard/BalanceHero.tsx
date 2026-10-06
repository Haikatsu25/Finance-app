"use client";

import { Save, History, Database } from "lucide-react";
import { TransactionItem } from "@/types";
import { money, moneyParts } from "@/lib/format";
import { summarizeMonth } from "@/lib/finance-utils";

// Losa plana del color del saldo: verde si te queda dinero, roja si te falta.
// Es lo único saturado de la pantalla; todo lo demás es tinta sobre cal.
export function BalanceHero({
  isPositive, animatedAvailable, transactions, currentMonthKey,
  totalAssets, totalLiabilities, totalFixedCosts, totalMsiMonthly,
  onSaveSnapshot, onViewHistory, onOpenSettings,
}: {
  isPositive: boolean;
  animatedAvailable: number;
  transactions: TransactionItem[];
  currentMonthKey: string;
  totalAssets: number;
  totalLiabilities: number;
  totalFixedCosts: number;
  totalMsiMonthly: number;
  onSaveSnapshot: () => void;
  onViewHistory: () => void;
  onOpenSettings: () => void;
}) {
  const p = moneyParts(Math.abs(animatedAvailable));
  const ms = summarizeMonth(transactions, currentMonthKey);
  const hasMonthActivity = ms.income !== 0 || ms.expense !== 0;

  return (
    <section
      id="balance-card"
      data-state={isPositive ? "in" : "out"}
      className="hero-slab col-span-1 md:col-span-8 flex flex-col"
      aria-labelledby="balance-label"
    >
      <div className="flex items-start justify-between gap-3">
        <p id="balance-label" className="text-base font-bold">
          {isPositive ? "Disponible real este mes" : "Déficit este mes"}
        </p>
        <span className="text-xs font-bold border-2 border-current rounded-md px-1.5 py-0.5" aria-label="Pesos mexicanos">
          MXN
        </span>
      </div>

      <h2 className="figure figure-xl tnum mt-3 sm:mt-4 mb-4 sm:mb-5">
        {!isPositive && "−"}{p.int}
        {!p.masked && p.cents && (
          <span className="text-[0.4em] align-top ml-1 inline-block pt-[0.18em]">{p.cents}</span>
        )}
      </h2>

      <div className="space-y-1 text-sm font-medium max-w-[46ch]">
        {(totalFixedCosts > 0 || totalMsiMonthly > 0) && (
          <p className="tnum">
            Ya descontado: {money(totalLiabilities)} de deudas
            {totalFixedCosts > 0 && `, ${money(totalFixedCosts)} de fijos`}
            {totalMsiMonthly > 0 && ` y ${money(totalMsiMonthly)} de MSI`},
            de {money(totalAssets)} en activos.
          </p>
        )}
        {hasMonthActivity && (
          <p className="tnum">
            En {monthPhrase(ms.net)}
            {ms.expense > 0 && `, ${money(ms.expense)} gastados`}.
          </p>
        )}
      </div>

      <div className="flex gap-2.5 flex-wrap mt-6 sm:mt-7">
        <button id="save-snapshot-btn" type="button" className="slab-btn" data-solid="true" onClick={onSaveSnapshot}>
          <Save size={16} aria-hidden />
          Guardar snapshot
        </button>
        <button type="button" className="slab-btn" onClick={onViewHistory}>
          <History size={16} aria-hidden />
          Ver historial
        </button>
        <button type="button" className="slab-btn" onClick={onOpenSettings}>
          <Database size={16} aria-hidden />
          Ajustes
        </button>
      </div>
    </section>
  );

  function monthPhrase(net: number) {
    return `${net >= 0 ? "+" : "−"}${money(Math.abs(net))} netos este mes`;
  }
}
