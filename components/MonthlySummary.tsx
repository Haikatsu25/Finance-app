"use client";

import React from "react";
import { money } from "@/lib/format";
import { MonthSummary } from "@/lib/finance-utils";

function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous <= 0) return null;
  const pct = ((current - previous) / previous) * 100;
  if (!Number.isFinite(pct) || Math.abs(pct) < 1) return null;
  const up = pct > 0;
  return (
    <small className={up ? "text-money-out-text" : "text-money-in-text"} style={{ fontWeight: 700 }}>
      {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}% vs mes anterior
    </small>
  );
}

export default function MonthlySummary({ summary, prevSummary }: {
  summary: MonthSummary;
  prevSummary: MonthSummary;
}) {
  if (summary.count === 0) return null;

  return (
    <section className="pop-card">
      <div className="sec-h">
        <h2 className="sec">Tu mes en números</h2>
      </div>
      <div className="grid2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="kv">
          <small>Entró</small>
          <b className="num text-money-in-text">{money(summary.income)}</b>
        </div>
        <div className="kv">
          <small>Salió</small>
          <b className="num text-money-out-text">{money(summary.expense)}</b>
          <Delta current={summary.expense} previous={prevSummary.expense} />
        </div>
        <div className="kv">
          <small>Balance del mes</small>
          <b className={`num ${summary.net >= 0 ? "text-money-in-text" : "text-money-out-text"}`}>
            {summary.net < 0 && "−"}{money(Math.abs(summary.net))}
          </b>
        </div>
        <div className="kv">
          <small>Categoría con más gasto</small>
          {summary.topCategory ? (
            <>
              <b className="truncate" style={{ fontSize: 17 }}>{summary.topCategory.category}</b>
              <small className="num">{money(summary.topCategory.amount)}</small>
            </>
          ) : (
            <b className="mute" style={{ fontSize: 14 }}>Sin datos</b>
          )}
        </div>
      </div>
      {summary.biggestExpense && (
        <p className="summary" style={{ margin: "14px 0 0" }}>
          Tu gasto más grande: <b className="text-foreground">{summary.biggestExpense.label}</b>{" "}
          <b className="tnum text-foreground">({money(summary.biggestExpense.amount)})</b>
        </p>
      )}
    </section>
  );
}
