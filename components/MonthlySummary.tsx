"use client";

import React from "react";
import { Card, CardBody } from "@heroui/react";
import { money } from "@/lib/format";
import { MonthSummary } from "@/lib/finance-utils";

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0) return null;
  const pct = ((current - previous) / previous) * 100;
  if (!Number.isFinite(pct) || Math.abs(pct) < 1) return null;
  const up = pct > 0;
  return (
    <span className={`text-[11px] font-bold ${up ? "text-money-out-text" : "text-money-in-text"}`}>
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
    <Card className="glass rule-ink shadow-none">
      <CardBody className="p-5">
        <h4 className="text-sm font-bold mb-3">Tu mes en números</h4>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5">
          <div>
            <p className="text-xs font-semibold text-default-500 mb-1">Entró</p>
            <p className="figure text-[2rem] text-money-in-text">{money(summary.income)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-default-500 mb-1">Salió</p>
            <p className="figure text-[2rem] text-money-out-text">{money(summary.expense)}</p>
            <Delta current={summary.expense} previous={prevSummary.expense} />
          </div>
          <div>
            <p className="text-xs font-semibold text-default-500 mb-1">Balance del mes</p>
            <p className={`figure text-[2rem] ${summary.net >= 0 ? "text-foreground" : "text-money-out-text"}`}>
              {summary.net < 0 && "−"}{money(Math.abs(summary.net))}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-default-500 mb-1">Categoría con más gasto</p>
            {summary.topCategory ? (
              <>
                <p className="text-sm font-bold truncate">{summary.topCategory.category}</p>
                <p className="text-xs tnum text-default-500">{money(summary.topCategory.amount)}</p>
              </>
            ) : (
              <p className="text-sm text-default-500">Sin datos</p>
            )}
          </div>
        </div>
        {summary.biggestExpense && (
          <p className="mt-4 text-xs text-default-500">
            Tu gasto más grande: <span className="text-foreground font-semibold">{summary.biggestExpense.label}</span>{" "}
            <span className="tnum text-foreground font-bold">({money(summary.biggestExpense.amount)})</span>
          </p>
        )}
      </CardBody>
    </Card>
  );
}
