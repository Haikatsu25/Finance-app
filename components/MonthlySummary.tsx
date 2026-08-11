"use client";

import React from "react";
import { Card, CardBody } from "@heroui/react";
import { TrendingUp, TrendingDown, Crown, Zap } from "lucide-react";
import { money } from "@/lib/format";
import { MonthSummary } from "@/lib/finance-utils";

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0) return null;
  const pct = ((current - previous) / previous) * 100;
  if (!Number.isFinite(pct) || Math.abs(pct) < 1) return null;
  const up = pct > 0;
  return (
    <span className={`text-[10px] font-bold ${up ? "text-rose-400" : "text-emerald-400"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% vs mes anterior
    </span>
  );
}

export default function MonthlySummary({ summary, prevSummary }: {
  summary: MonthSummary;
  prevSummary: MonthSummary;
}) {
  if (summary.count === 0) return null;

  return (
    <Card className="hero-card glow-hero-positive border-0 overflow-hidden relative animate-fade-in-scale">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full border border-white/10" />
      <CardBody className="relative z-10 p-5">
        <p className="text-white/50 font-semibold text-[10px] tracking-[0.2em] uppercase mb-3 flex items-center gap-1.5">
          <Zap size={11} className="text-emerald-400" /> Tu mes en números
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingUp size={13} className="text-emerald-400" />
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Entró</p>
            </div>
            <p className="text-xl font-black tnum text-emerald-400">{money(summary.income)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingDown size={13} className="text-rose-400" />
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Salió</p>
            </div>
            <p className="text-xl font-black tnum text-rose-400">{money(summary.expense)}</p>
            <Delta current={summary.expense} previous={prevSummary.expense} />
          </div>
          <div>
            <p className="text-[10px] text-white/50 uppercase tracking-wider mb-0.5">Balance del mes</p>
            <p className={`text-xl font-black tnum ${summary.net >= 0 ? "text-white" : "text-rose-400"}`}>
              {summary.net < 0 && "−"}{money(Math.abs(summary.net))}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Crown size={13} className="text-amber-400" />
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Top categoría</p>
            </div>
            {summary.topCategory ? (
              <>
                <p className="text-sm font-bold text-white truncate">{summary.topCategory.category}</p>
                <p className="text-[11px] tnum text-white/60">{money(summary.topCategory.amount)}</p>
              </>
            ) : (
              <p className="text-sm text-white/40">—</p>
            )}
          </div>
        </div>
        {summary.biggestExpense && (
          <p className="mt-3 text-[11px] text-white/50">
            Tu gasto más grande: <span className="text-white/80 font-semibold">{summary.biggestExpense.label}</span>{" "}
            <span className="tnum text-white/80 font-bold">({money(summary.biggestExpense.amount)})</span>
          </p>
        )}
      </CardBody>
    </Card>
  );
}
