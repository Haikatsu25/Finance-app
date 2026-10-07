"use client";

import { useMemo } from "react";
import {
  Sparkles, TriangleAlert, CreditCard, PiggyBank, TrendingUp,
  Layers, Target, CalendarClock, Wallet, ShieldCheck, Check,
} from "lucide-react";
import { FinanceData, computeHealthScore, computeInsights, Insight } from "@/lib/insights";

// ─────────────────────────────────────────────────────────────────
// Score de salud + hallazgos automáticos: calculados al instante, sin IA ni internet.
// El botón manda el análisis profundo al chat. El color de dinero no se usa aquí: la
// gravedad se dice con el ícono (rojo sólido si es urgente) y con el texto.
// ─────────────────────────────────────────────────────────────────

const ICONS: Record<Insight["icon"], React.ReactNode> = {
  pay: <CalendarClock size={18} aria-hidden />,
  card: <CreditCard size={18} aria-hidden />,
  budget: <Wallet size={18} aria-hidden />,
  trend: <TrendingUp size={18} aria-hidden />,
  msi: <Layers size={18} aria-hidden />,
  goal: <Target size={18} aria-hidden />,
  fund: <PiggyBank size={18} aria-hidden />,
  cut: <CalendarClock size={18} aria-hidden />,
};

export default function AIInsights({ data, onAskAI }: {
  data: FinanceData;
  onAskAI: (prompt: string) => void;
}) {
  const health = useMemo(() => computeHealthScore(data), [data]);
  const insights = useMemo(() => computeInsights(data), [data]);

  const hasData = data.assets.length + data.liabilities.length + data.creditCards.length + data.transactions.length > 0;
  if (!hasData) return null;

  const negatives = health.factors.filter((f) => f.points < 0);
  const positives = health.factors.filter((f) => f.points === 0);

  return (
    <>
      <h2 className="wide sec sec-lg px-0.5">IA</h2>

      {/* ── Salud financiera ───────────────────────────────── */}
      <section className="pop-card">
        <div className="sec-h">
          <h2 className="sec">Salud financiera</h2>
          <span className="chip">{health.label}</span>
        </div>

        <div className="score">
          <div
            className="big" style={{ ["--p" as string]: health.score }}
            role="img" aria-label={`Puntaje de salud financiera: ${health.score} de 100`}
          >
            <span>
              <span style={{ display: "block", lineHeight: 1 }}>{health.score}</span>
              <small>de 100</small>
            </span>
          </div>
          <ul>
            {negatives.length === 0 ? (
              <li>
                <ShieldCheck size={16} className="shrink-0 mt-0.5 text-money-in-text" aria-hidden />
                <div>Nada te resta puntos<small>Impecable</small></div>
              </li>
            ) : (
              negatives.slice(0, 4).map((f) => (
                <li key={f.label}>
                  <b>{String(f.points).replace("-", "−")}</b>
                  <div><span>{f.label}</span><small>{f.detail}</small></div>
                </li>
              ))
            )}
          </ul>
        </div>

        {positives.length > 0 && negatives.length > 0 && (
          <p className="summary flex items-start gap-1.5" style={{ margin: "12px 0 0" }}>
            <Check size={14} className="shrink-0 mt-0.5 text-money-in-text" aria-hidden />
            <span>Bien en: {positives.map((f) => f.label).join(", ")}</span>
          </p>
        )}

        <button
          type="button" className="btn w-full mt-4"
          onClick={() => onAskAI(
            "Analiza a fondo mis finanzas: dime mis 2 fortalezas, mis 2 riesgos principales y dame 3 acciones concretas priorizadas para este mes, con montos específicos."
          )}
        >
          <Sparkles size={16} aria-hidden /> Análisis profundo con IA
        </button>
      </section>

      {/* ── Hallazgos de hoy ───────────────────────────────── */}
      <section className="pop-card">
        <div className="sec-h">
          <h2 className="sec">Hallazgos de hoy</h2>
          <span className="chip">Con tus datos</span>
        </div>

        {insights.length === 0 ? (
          <div className="empty flex flex-col items-center gap-1.5">
            <ShieldCheck size={26} aria-hidden />
            <p className="font-semibold">Sin pendientes ni alertas: todo en orden</p>
          </div>
        ) : (
          <ul className="list">
            {insights.map((ins) => {
              const urgent = ins.severity === "alert";
              return (
                <li key={ins.id} className={`find ${urgent ? "urg" : ""}`}>
                  <i>{urgent ? <TriangleAlert size={18} aria-hidden /> : ICONS[ins.icon]}</i>
                  <div className="min-w-0">
                    <b>{ins.title}</b>
                    <p>{ins.detail}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
