"use client";

import React, { useMemo } from "react";
import { Card, CardBody, Button } from "@heroui/react";
import {
  Sparkles, AlertTriangle, CreditCard, PiggyBank, TrendingUp,
  Layers, Target, CalendarClock, Wallet, ShieldCheck,
} from "lucide-react";
import { FinanceData, computeHealthScore, computeInsights, Insight } from "@/lib/insights";

// ─────────────────────────────────────────────────────────────────
// Score de salud + insights automáticos — calculados al instante,
// sin IA ni internet. El botón manda el análisis profundo al chat.
// ─────────────────────────────────────────────────────────────────

const ICONS: Record<Insight["icon"], React.ReactNode> = {
  pay: <CalendarClock size={15} />,
  card: <CreditCard size={15} />,
  budget: <Wallet size={15} />,
  trend: <TrendingUp size={15} />,
  msi: <Layers size={15} />,
  goal: <Target size={15} />,
  fund: <PiggyBank size={15} />,
  cut: <CalendarClock size={15} />,
};

const SEVERITY_CLS: Record<Insight["severity"], { box: string; icon: string; badge: string }> = {
  alert: { box: "bg-rose-500/8 border-rose-500/25", icon: "bg-rose-500/15 text-rose-500", badge: "Urgente" },
  warn:  { box: "bg-amber-500/8 border-amber-500/25", icon: "bg-amber-500/15 text-amber-500", badge: "Atención" },
  tip:   { box: "bg-blue-500/8 border-blue-500/20", icon: "bg-blue-500/15 text-blue-500", badge: "Consejo" },
  good:  { box: "bg-emerald-500/8 border-emerald-500/25", icon: "bg-emerald-500/15 text-emerald-500", badge: "Bien" },
};

const TONE_HEX: Record<string, string> = {
  emerald: "#10b981",
  lime: "#84cc16",
  amber: "#f59e0b",
  rose: "#f43f5e",
};

function ScoreRing({ score, tone }: { score: number; tone: string }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const color = TONE_HEX[tone] || "#10b981";
  return (
    <svg viewBox="0 0 128 128" className="w-32 h-32">
      <circle cx="64" cy="64" r={R} fill="none" stroke="currentColor" strokeWidth="10" className="text-default-200/40" />
      <circle
        cx="64" cy="64" r={R} fill="none"
        stroke={color} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - score / 100)}
        transform="rotate(-90 64 64)"
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.2,0,0,1)" }}
      />
      <text x="64" y="60" textAnchor="middle" className="fill-current text-foreground" fontSize="30" fontWeight="900">
        {score}
      </text>
      <text x="64" y="80" textAnchor="middle" fontSize="11" fill={color} fontWeight="700">
        / 100
      </text>
    </svg>
  );
}

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* ── Score de salud ─────────────────────────────────── */}
      <Card className="glass card-hover border border-default-200/50 lg:col-span-5">
        <CardBody className="p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-bold uppercase tracking-wider text-default-400">Salud financiera</p>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full" style={{ background: `${TONE_HEX[health.tone]}20`, color: TONE_HEX[health.tone] }}>
              {health.label}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <ScoreRing score={health.score} tone={health.tone} />
            <div className="flex-1 space-y-1.5 min-w-0">
              {negatives.length === 0 ? (
                <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Nada te resta puntos — impecable
                </p>
              ) : (
                negatives.slice(0, 4).map((f) => (
                  <div key={f.label} className="flex items-start gap-2">
                    <span className="text-[10px] font-black tnum text-rose-500 shrink-0 mt-0.5 w-7 text-right">{f.points}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-default-700 leading-tight">{f.label}</p>
                      <p className="text-[10px] text-default-400 leading-tight">{f.detail}</p>
                    </div>
                  </div>
                ))
              )}
              {positives.length > 0 && negatives.length > 0 && (
                <p className="text-[10px] text-default-400 pt-1">
                  ✓ Bien en: {positives.map((f) => f.label).join(", ")}
                </p>
              )}
            </div>
          </div>

          <Button
            fullWidth size="sm" variant="flat" color="secondary"
            className="mt-4 font-bold bg-indigo-500/15 text-indigo-500 dark:text-indigo-400"
            startContent={<Sparkles size={14} />}
            onPress={() => onAskAI(
              "Analiza a fondo mis finanzas: dime mis 2 fortalezas, mis 2 riesgos principales y dame 3 acciones concretas priorizadas para este mes, con montos específicos."
            )}
          >
            Análisis profundo con IA
          </Button>
        </CardBody>
      </Card>

      {/* ── Insights automáticos ───────────────────────────── */}
      <Card className="glass card-hover border border-default-200/50 lg:col-span-7">
        <CardBody className="p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-default-400 mb-3">
            Hallazgos de hoy
            <span className="normal-case font-medium text-default-300 ml-2">calculados con tus datos, al instante</span>
          </p>

          {insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-default-400 gap-1">
              <ShieldCheck size={26} className="text-emerald-500/60" />
              <p className="text-xs font-medium">Sin pendientes ni alertas — todo en orden</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {insights.map((ins) => {
                const s = SEVERITY_CLS[ins.severity];
                return (
                  <div key={ins.id} className={`p-3 rounded-xl border ${s.box} animate-fade-in-scale`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1.5 rounded-lg ${s.icon} shrink-0`}>{ICONS[ins.icon]}</div>
                      <p className="text-xs font-bold text-default-800 leading-tight">{ins.title}</p>
                    </div>
                    <p className="text-[11px] text-default-500 leading-snug">{ins.detail}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
