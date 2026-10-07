"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

// Colores de las gráficas. Los atributos SVG de Recharts no resuelven var(), así que se leen ya
// resueltos de los tokens (y se releen al cambiar de tema). Nunca se hereda el stroke de los
// íconos: cada serie declara el suyo y los ejes no llevan ninguno.
export type ChartColors = {
  pop1: string; pop3: string; pop4: string; out: string;
  ink: string; mute: string; card: string; line: string;
};

const FALLBACK: ChartColors = {
  pop1: "#2f9e8f", pop3: "#3b82f6", pop4: "#e7772b", out: "#d9473f",
  ink: "#0e1a33", mute: "#6b7590", card: "#ffffff", line: "rgba(14,26,51,.07)",
};

export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ChartColors>(FALLBACK);
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
    setColors({
      pop1: v("--pop1", FALLBACK.pop1), pop3: v("--pop3", FALLBACK.pop3), pop4: v("--pop4", FALLBACK.pop4),
      out: v("--money-out", FALLBACK.out),
      ink: v("--ink", FALLBACK.ink), mute: v("--ink-soft", FALLBACK.mute),
      card: v("--card-bg", FALLBACK.card), line: v("--rule", FALLBACK.line),
    });
  }, [resolvedTheme]);
  return colors;
}
