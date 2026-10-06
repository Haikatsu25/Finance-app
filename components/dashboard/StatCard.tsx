"use client";

import React from "react";
import { Card, CardBody } from "@heroui/react";
import { money } from "@/lib/format";
import { TONE, type ToneName } from "./tone";
import { useAnimatedCounter } from "./useAnimatedCounter";

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────
export function StatCard({
  label, value, icon, tone, delay = 0,
}: {
  label: string; value: number; icon: React.ReactNode; tone: ToneName; delay?: number;
}) {
  const animated = useAnimatedCounter(value);
  const t = TONE[tone];
  return (
    <Card
      className="glass card-hover border-0 animate-fade-in-scale rounded-2xl md:rounded-3xl"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Móvil: tile vertical compacta (3 en fila). Desktop: fila con icono a la derecha. */}
      <CardBody className="flex flex-col md:flex-row md:justify-between items-start md:items-center p-3 md:p-5 gap-2 md:gap-0">
        <div className={`p-1.5 md:p-3 ${t.iconBg} rounded-lg md:rounded-2xl shrink-0 md:order-2 [&_svg]:w-4 [&_svg]:h-4 md:[&_svg]:w-5 md:[&_svg]:h-5`}>
          <div className={t.text}>{icon}</div>
        </div>
        <div className="min-w-0 md:order-1 w-full">
          <p className="text-default-500 text-[9px] md:text-[11px] font-bold uppercase tracking-wider mb-0.5 md:mb-1 truncate">{label}</p>
          {/* Número en blanco/tinta; el color queda en el icono (estilo Revolut) */}
          <p className="text-sm sm:text-base md:text-2xl font-extrabold tnum tracking-tight text-foreground truncate">
            {money(Math.abs(animated))}
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
