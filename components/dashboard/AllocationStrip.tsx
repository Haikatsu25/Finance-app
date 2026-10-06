"use client";

import { money } from "@/lib/format";

type Segment = { key: string; label: string; amount: number; cls: string };

// Reparto de los activos: a dónde se va el dinero antes de que sea tuyo.
// Mismo cálculo que el saldo del héroe: activos − deudas − apartados − fijos − MSI.
export function AllocationStrip({
  totalAssets, totalLiabilities, totalBuckets, totalFixedCosts, totalMsiMonthly, remaining,
}: {
  totalAssets: number;
  totalLiabilities: number;
  totalBuckets: number;
  totalFixedCosts: number;
  totalMsiMonthly: number;
  /** Lo que queda tras deudas, apartados, fijos y MSI (puede ser negativo) */
  remaining: number;
}) {
  const segments: Segment[] = [
    { key: "debts",  label: "Deudas",     amount: totalLiabilities, cls: "seg-out" },
    { key: "fixed",  label: "Fijos",      amount: totalFixedCosts,  cls: "seg-fixed" },
    { key: "msi",    label: "MSI del mes", amount: totalMsiMonthly,  cls: "seg-msi" },
    { key: "hold",   label: "Apartados",  amount: totalBuckets,     cls: "seg-hold" },
    { key: "left",   label: "Te queda",   amount: Math.max(remaining, 0), cls: "seg-in" },
  ].filter((s) => s.amount > 0);

  const base = Math.max(totalAssets, segments.reduce((sum, s) => sum + s.amount, 0));

  if (base <= 0) {
    return (
      <div className="glass px-4 py-4 text-sm text-default-500">
        Agrega una cuenta en «Ingresos &amp; Activos» y aquí verás cómo se reparte tu dinero.
      </div>
    );
  }

  const overcommitted = segments.reduce((sum, s) => sum + s.amount, 0) > totalAssets;
  const summary = segments.map((s) => `${s.label} ${money(s.amount)}`).join(", ");

  return (
    <div className="glass px-4 py-4 sm:px-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-sm font-bold">A dónde se va tu dinero</h3>
        <span className="text-xs text-default-500 tnum">
          {overcommitted ? `Comprometes ${money(base)} y tienes ${money(totalAssets)}` : `${money(base)} en total`}
        </span>
      </div>

      <div
        className="flex h-9 sm:h-11 gap-[3px] overflow-hidden rounded-md"
        role="img"
        aria-label={`Reparto de tus activos: ${summary}`}
      >
        {segments.map((s, i) => (
          <div
            key={s.key}
            className={`strip-seg ${s.cls}`}
            style={{ flexGrow: s.amount, flexBasis: 0, ["--i" as string]: i }}
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-xs sm:text-[13px]">
            <span className={`inline-block w-3.5 h-3.5 rounded-[3px] ${s.cls}`} aria-hidden />
            <span className="text-default-600 font-medium">{s.label}</span>
            <span className="font-bold tnum">{money(s.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
