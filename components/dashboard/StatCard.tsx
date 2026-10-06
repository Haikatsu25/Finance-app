"use client";

import { money } from "@/lib/format";
import { TONE, type ToneName } from "./tone";
import { useAnimatedCounter } from "./useAnimatedCounter";

// El filo superior lleva el color del flujo (entra / sale / se aparta);
// la cifra va en tinta para que el color siga significando una sola cosa.
export function StatCard({
  label, value, tone,
}: {
  label: string; value: number; tone: ToneName;
}) {
  const animated = useAnimatedCounter(value);
  const t = TONE[tone];
  return (
    <div className={`glass ${t.rule} min-w-0 px-3 py-3 md:px-5 md:py-4`}>
      <p className="text-xs md:text-sm font-semibold text-default-500 truncate">{label}</p>
      <p className="figure text-[1.65rem] sm:text-3xl md:text-[2.5rem] mt-1.5 md:mt-2 text-foreground truncate">
        {money(Math.abs(animated))}
      </p>
    </div>
  );
}
