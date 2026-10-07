"use client";

import { TransactionItem } from "@/types";
import { money, moneyParts } from "@/lib/format";
import { summarizeMonth } from "@/lib/finance-utils";

// Héroe marino con tres círculos de color. El saldo lleva el signo si es déficit; el anillo muestra
// qué parte de tus activos queda disponible.
export function BalanceHero({
  isPositive, animatedAvailable, transactions, currentMonthKey,
  totalAssets, totalLiabilities, totalFixedCosts, totalMsiMonthly,
  onSaveSnapshot, onViewHistory,
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
}) {
  const p = moneyParts(Math.abs(animatedAvailable));
  const ms = summarizeMonth(transactions, currentMonthKey);
  const pct = totalAssets > 0 ? Math.max(0, Math.min(100, (animatedAvailable / totalAssets) * 100)) : 0;

  return (
    <section
      id="balance-card"
      data-state={isPositive ? "in" : "out"}
      className="hero-slab"
      aria-labelledby="balance-label"
    >
      <div className="flex items-center justify-between gap-3 text-[14px] font-medium text-(--hero-mute)">
        <p id="balance-label">{isPositive ? "Disponible real este mes" : "Déficit este mes"}</p>
        <span className="text-[11px] font-bold px-2.5 py-[3px] rounded-full border border-white/30 text-white" aria-label="Pesos mexicanos">
          MXN
        </span>
      </div>

      <h2 className="figure figure-xl tnum mt-2.5 mb-2">
        {!isPositive && "−"}{p.int}
        {!p.masked && p.cents && (
          <span className="text-[24px] align-top ml-0.5 inline-block pt-[2px]">{p.cents}</span>
        )}
      </h2>

      {(totalFixedCosts > 0 || totalMsiMonthly > 0 || totalLiabilities > 0 || ms.expense > 0) && (
        <p className="text-[13px] leading-[1.45] text-(--hero-mute) max-w-[32ch] md:max-w-[46ch] tnum">
          Ya descontado:{" "}
          {totalLiabilities > 0 && <><strong className="text-white font-bold">{money(totalLiabilities)}</strong> de deudas, </>}
          <strong className="text-white font-bold">{money(totalFixedCosts)}</strong> fijos y{" "}
          <strong className="text-white font-bold">{money(totalMsiMonthly)}</strong> de MSI, de {money(totalAssets)} en activos.
          {ms.expense > 0 && <> Este mes llevas <strong className="text-white font-bold">{money(ms.expense)}</strong> gastados.</>}
        </p>
      )}

      <div className="flex items-center justify-between gap-2.5 mt-3.5">
        <div className="flex gap-2">
          <button id="save-snapshot-btn" type="button" className="slab-btn" data-solid="true" onClick={onSaveSnapshot}>
            Guardar snapshot
          </button>
          <button type="button" className="slab-btn" onClick={onViewHistory}>
            Ver historial
          </button>
        </div>
        <div className="ring" style={{ ["--p" as string]: Math.round(pct) }} role="img" aria-label={`Disponible real: ${Math.round(pct)}% de tus activos`}>
          <span>{Math.round(pct)}%</span>
        </div>
      </div>
    </section>
  );
}
