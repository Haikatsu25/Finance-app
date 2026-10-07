"use client";

import { useMemo } from "react";
import { Card, CardBody, Button } from "@heroui/react";
import {
  Sparkles, AlertTriangle, CreditCard, PiggyBank, TrendingUp,
  Layers, Target, CalendarClock, Wallet, ShieldCheck, Check,
} from "lucide-react";
import { FinanceData, computeHealthScore, computeInsights, Insight } from "@/lib/insights";

// ─────────────────────────────────────────────────────────────────
// Score de salud + insights automáticos — calculados al instante,
// sin IA ni internet. El botón manda el análisis profundo al chat.
//
// El color queda para el dinero: el score y la gravedad no son un
// flujo, así que se dicen con forma (relleno, contorno, sin marco)
// y con texto, no con verde/ámbar/rojo.
// ─────────────────────────────────────────────────────────────────

const ICONS: Record<Insight["icon"], React.ReactNode> = {
  pay: <CalendarClock size={16} />,
  card: <CreditCard size={16} />,
  budget: <Wallet size={16} />,
  trend: <TrendingUp size={16} />,
  msi: <Layers size={16} />,
  goal: <Target size={16} />,
  fund: <PiggyBank size={16} />,
  cut: <CalendarClock size={16} />,
};

// Urgente: bloque relleno. Atención: contorno de 2px. Consejo y Bien: sin énfasis.
const SEVERITY_CLS: Record<Insight["severity"], { box: string; muted: string; badge: string; alert: boolean }> = {
  alert: { box: "bg-foreground text-background border-foreground", muted: "text-background", badge: "Urgente", alert: true },
  warn:  { box: "border-2 border-foreground", muted: "text-default-700", badge: "Atención", alert: false },
  tip:   { box: "border border-default-300", muted: "text-default-700", badge: "Consejo", alert: false },
  good:  { box: "border border-default-300", muted: "text-default-700", badge: "Bien", alert: false },
};

function ScoreRing({ score }: { score: number }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 128 128" className="w-32 h-32 shrink-0" role="img" aria-label={`Puntaje de salud financiera: ${score} de 100`}>
      <circle cx="64" cy="64" r={R} fill="none" stroke="currentColor" strokeWidth="10" className="text-default-200" />
      <circle
        cx="64" cy="64" r={R} fill="none"
        stroke="currentColor" strokeWidth="10" strokeLinecap="butt" className="text-foreground"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - score / 100)}
        transform="rotate(-90 64 64)"
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.2,0,0,1)" }}
      />
      <text x="64" y="68" textAnchor="middle" className="figure fill-current text-foreground" fontSize="44">
        {score}
      </text>
      <text x="64" y="88" textAnchor="middle" className="fill-current text-default-600" fontSize="12" fontWeight="600">
        de 100
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
      <Card className="glass card-hover rule-ink lg:col-span-5 shadow-none">
        <CardBody className="p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold">Salud financiera</h3>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-md border-2 border-foreground">{health.label}</span>
          </div>

          <div className="flex items-center gap-4">
            <ScoreRing score={health.score} />
            <div className="flex-1 space-y-2 min-w-0">
              {negatives.length === 0 ? (
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <ShieldCheck size={16} className="shrink-0" aria-hidden /> Nada te resta puntos. Impecable
                </p>
              ) : (
                negatives.slice(0, 4).map((f) => (
                  <div key={f.label} className="flex items-start gap-2">
                    <span className="figure text-[1.25rem] shrink-0 w-9 text-right leading-none mt-0.5">{String(f.points).replace("-", "−")}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight">{f.label}</p>
                      <p className="text-xs text-default-700 leading-snug">{f.detail}</p>
                    </div>
                  </div>
                ))
              )}
              {positives.length > 0 && negatives.length > 0 && (
                <p className="text-xs text-default-700 pt-1 flex items-start gap-1">
                  <Check size={13} className="shrink-0 mt-0.5" aria-hidden />
                  <span>Bien en: {positives.map((f) => f.label).join(", ")}</span>
                </p>
              )}
            </div>
          </div>

          <Button
            fullWidth color="primary" variant="solid"
            className="mt-4 font-bold h-11"
            startContent={<Sparkles size={16} />}
            onPress={() => onAskAI(
              "Analiza a fondo mis finanzas: dime mis 2 fortalezas, mis 2 riesgos principales y dame 3 acciones concretas priorizadas para este mes, con montos específicos."
            )}
          >
            Análisis profundo con IA
          </Button>
        </CardBody>
      </Card>

      {/* ── Insights automáticos ───────────────────────────── */}
      <Card className="glass card-hover rule-ink lg:col-span-7 shadow-none">
        <CardBody className="p-5">
          <div className="mb-3">
            <h3 className="text-sm font-bold">Hallazgos de hoy</h3>
            <p className="text-xs text-default-600">Calculados con tus datos, al instante</p>
          </div>

          {insights.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-default-700 gap-1.5">
              <ShieldCheck size={28} aria-hidden />
              <p className="text-sm font-semibold">Sin pendientes ni alertas: todo en orden</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {insights.map((ins) => {
                const s = SEVERITY_CLS[ins.severity];
                return (
                  <li key={ins.id} className={`p-3.5 rounded-lg border ${s.box}`}>
                    <p className={`text-xs font-bold mb-1 flex items-center gap-1.5 ${s.muted}`}>
                      {s.alert ? <AlertTriangle size={14} aria-hidden /> : null}
                      {s.badge}
                    </p>
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5" aria-hidden>{ICONS[ins.icon]}</span>
                      <p className="text-sm font-bold leading-snug">{ins.title}</p>
                    </div>
                    <p className={`text-xs leading-snug mt-1.5 ${s.muted}`}>{ins.detail}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
