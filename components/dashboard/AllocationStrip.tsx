"use client";

import { money } from "@/lib/format";

type Segment = { key: string; label: string; amount: number; color: string };

// Reparto de los activos: a dónde se va el dinero antes de que sea tuyo.
// Mismo cálculo que el saldo del héroe: activos − deudas − apartados − fijos − MSI.
// Los colores son pop1–4 (decoración); las deudas, que sí son dinero que sale, llevan el token de salida.
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
    { key: "debts", label: "Deudas",      amount: totalLiabilities,        color: "var(--money-out)" },
    { key: "fixed", label: "Fijos",       amount: totalFixedCosts,         color: "var(--pop4)" },
    { key: "msi",   label: "MSI del mes", amount: totalMsiMonthly,         color: "var(--pop2)" },
    { key: "hold",  label: "Apartados",   amount: totalBuckets,            color: "var(--pop3)" },
    { key: "left",  label: "Te queda",    amount: Math.max(remaining, 0),  color: "var(--pop1)" },
  ].filter((s) => s.amount > 0);

  const base = Math.max(totalAssets, segments.reduce((sum, s) => sum + s.amount, 0));

  if (base <= 0) {
    return (
      <div className="pop-card text-sm text-(--ink-soft)">
        Agrega una cuenta en «Ingresos y activos» y aquí verás cómo se reparte tu dinero.
      </div>
    );
  }

  const overcommitted = segments.reduce((sum, s) => sum + s.amount, 0) > totalAssets;
  const summary = segments.map((s) => `${s.label} ${money(s.amount)}`).join(", ");

  return (
    <section className="pop-card">
      <div className="sec-h">
        <h2 className="sec">A dónde se va tu dinero</h2>
        <span className="chip tnum">
          {overcommitted ? `Comprometes ${money(base)} y tienes ${money(totalAssets)}` : `${money(base)} en total`}
        </span>
      </div>

      <div className="bar" role="img" aria-label={`Reparto de tus activos: ${summary}`}>
        {segments.map((s, i) => (
          <span
            key={s.key}
            className="strip-seg"
            style={{ flexGrow: s.amount, flexBasis: 0, background: s.color, ["--i" as string]: i }}
          />
        ))}
      </div>

      <ul className="legend">
        {segments.map((s) => (
          <li key={s.key} style={{ ["--c" as string]: s.color }}>
            {s.label}
            <b>{money(s.amount)}</b>
          </li>
        ))}
      </ul>
    </section>
  );
}
