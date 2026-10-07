"use client";

import { TrendingUp, CreditCard, PiggyBank } from "lucide-react";
import { money } from "@/lib/format";
import type { ToneName } from "./tone";
import { useAnimatedCounter } from "./useAnimatedCounter";

// Bloque de cifra de color sólido (pop1 / pop4 / pop3) con ícono en círculo blanco.
// El color es decoración; el significado lo da la etiqueta.
const BLOCK: Record<string, { cls: string; icon: React.ReactNode }> = {
  emerald: { cls: "a", icon: <TrendingUp size={17} aria-hidden /> },
  rose:    { cls: "b", icon: <CreditCard size={17} aria-hidden /> },
  amber:   { cls: "c", icon: <PiggyBank size={17} aria-hidden /> },
};

export function StatCard({
  label, value, tone,
}: {
  label: string; value: number; tone: ToneName;
}) {
  const animated = useAnimatedCounter(value);
  const b = BLOCK[tone] ?? BLOCK.emerald;
  return (
    <div className={`tile ${b.cls}`}>
      <i>{b.icon}</i>
      <small>{label}</small>
      <b className="truncate">{money(Math.abs(animated))}</b>
    </div>
  );
}
