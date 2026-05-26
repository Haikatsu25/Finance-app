"use client";

import React, { useMemo, useState } from "react";
import { Card, CardBody, CardHeader, Chip, Progress, Button } from "@heroui/react";
import { HistorySnapshot, FinanceItem } from "@/types";
import { Brain, Zap, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Info } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// NEURAL NETWORK IMPLEMENTATION — Feedforward 2-Layer Network
// Architecture: 5 inputs → 4 hidden (ReLU) → 2 outputs (Sigmoid)
// This is implemented from scratch in TypeScript (no ML libraries needed)
// ─────────────────────────────────────────────────────────────────────────────

function relu(x: number): number {
  return Math.max(0, x);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

// Pre-trained weights (handcrafted to produce meaningful financial analysis)
// Weights are designed to reflect real financial logic:
//   - High assets + low liabilities → good balance prediction
//   - High debt ratio → high risk score

const W1: number[][] = [
  // 4 hidden neurons × 5 inputs each
  // savingsRate, debtRatio, assetGrowth, bucketPct, liquidityRatio
  [ 1.8, -2.1,  0.9,  0.6,  1.2],  // Neuron 1: savings strength
  [-1.5,  2.3, -0.8,  0.4, -1.0],  // Neuron 2: debt pressure
  [ 0.7, -0.9,  1.8,  1.1,  0.5],  // Neuron 3: growth signal
  [ 1.2, -1.4,  0.6,  1.6,  0.9],  // Neuron 4: diversification
];

const B1: number[] = [0.1, -0.2, 0.05, 0.15];

const W2: number[][] = [
  // 2 outputs × 4 hidden inputs
  [ 1.4, -1.6,  1.1,  0.9],  // Output 1: balance predictor
  [-1.2,  1.8, -0.7, -1.0],  // Output 2: risk indicator
];

const B2: number[] = [0.0, 0.1];

interface ForwardResult {
  inputs: number[];
  hidden: number[];
  outputs: number[];
}

function forwardPass(inputs: number[]): ForwardResult {
  // Layer 1: hidden
  const hidden = W1.map((weights, i) => {
    const z = weights.reduce((sum, w, j) => sum + w * inputs[j], 0) + B1[i];
    return relu(z);
  });

  // Layer 2: output
  const outputs = W2.map((weights, i) => {
    const z = weights.reduce((sum, w, j) => sum + w * hidden[j], 0) + B2[i];
    return sigmoid(z);
  });

  return { inputs, hidden, outputs };
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANCIAL FEATURE EXTRACTION
// ─────────────────────────────────────────────────────────────────────────────

function extractFeatures(
  history: HistorySnapshot[],
  assets: FinanceItem[],
  liabilities: FinanceItem[]
): { features: number[]; raw: Record<string, number> } {
  const totalAssets     = assets.reduce((s, i) => s + i.amount, 0);
  const totalLiabilities = liabilities.reduce((s, i) => s + i.amount, 0);
  const netWorth        = totalAssets - totalLiabilities;

  // Savings rate = (assets - liabilities) / assets
  const savingsRate = totalAssets > 0
    ? Math.max(0, netWorth / totalAssets)
    : 0;

  // Debt ratio = liabilities / assets
  const debtRatio = totalAssets > 0
    ? Math.min(2, totalLiabilities / totalAssets)
    : 1;

  // Asset growth rate from history
  let assetGrowth = 0;
  if (history.length >= 2) {
    const sorted  = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const oldest  = sorted[0].totalAssets;
    const newest  = sorted[sorted.length - 1].totalAssets;
    assetGrowth   = oldest > 0 ? Math.min(1, Math.max(-1, (newest - oldest) / oldest)) : 0;
  }

  // Bucket percentage (savings allocation)
  const totalBuckets = assets.length > 0
    ? history.length > 0 ? history[0].totalBuckets : 0
    : 0;
  const bucketPct = totalAssets > 0
    ? Math.min(1, totalBuckets / totalAssets)
    : 0;

  // Liquidity ratio (simplified)
  const liquidityRatio = totalLiabilities > 0
    ? Math.min(2, totalAssets / totalLiabilities)
    : 1;

  const raw = {
    savingsRate: savingsRate * 100,
    debtRatio: debtRatio * 100,
    assetGrowth: assetGrowth * 100,
    bucketPct: bucketPct * 100,
    liquidityRatio,
  };

  // Normalize all to [0, 1]
  const features = [
    normalize(savingsRate, 0, 1),
    normalize(debtRatio, 0, 2),
    normalize(assetGrowth, -1, 1),
    normalize(bucketPct, 0, 1),
    normalize(liquidityRatio, 0, 2),
  ];

  return { features, raw };
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

type HealthStatus = "En Riesgo" | "Estable" | "Próspero";

function classifyHealth(balanceScore: number, riskScore: number): {
  status: HealthStatus;
  color: "danger" | "warning" | "success";
  emoji: string;
  description: string;
} {
  if (riskScore > 0.65 || balanceScore < 0.3) {
    return {
      status: "En Riesgo",
      color: "danger",
      emoji: "⚠️",
      description: "Tu nivel de deuda supera los parámetros óptimos. Considera reducir gastos no esenciales.",
    };
  } else if (balanceScore >= 0.3 && balanceScore < 0.65) {
    return {
      status: "Estable",
      color: "warning",
      emoji: "📊",
      description: "Finanzas equilibradas. Hay margen de mejora en ahorro e inversión.",
    };
  } else {
    return {
      status: "Próspero",
      color: "success",
      emoji: "🚀",
      description: "Excelente gestión financiera. Tus activos superan ampliamente tus pasivos.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NEURAL NETWORK SVG DIAGRAM
// ─────────────────────────────────────────────────────────────────────────────

function NeuralDiagram({ hidden, isDark }: { hidden: number[]; isDark: boolean }) {
  const w = 320;
  const h = 240;

  const inputLabels  = ["Ahorro", "Deuda", "Crecim.", "Apartado", "Liquid."];
  const outputLabels = ["Balance", "Riesgo"];
  const hiddenCount  = 4;

  const lx = 48;   // inputs x
  const hx = 160;  // hidden x
  const ox = 272;  // outputs x

  const inputY  = (i: number) => 28 + i * (h - 28) / (inputLabels.length - 1);
  const hiddenY = (i: number) => 40 + i * (h - 60) / (hiddenCount - 1);
  const outputY = (i: number) => 80 + i * 80;

  const nodeColor  = isDark ? "#6366f1" : "#4f46e5";
  const edgeColor  = isDark ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.25)";
  const activeEdge = isDark ? "rgba(16,185,129,0.6)" : "rgba(16,185,129,0.5)";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-xs mx-auto" aria-label="Diagrama de red neuronal">
      {/* Edges: inputs → hidden */}
      {inputLabels.map((_, i) =>
        Array.from({ length: hiddenCount }, (_, j) => (
          <line
            key={`ih-${i}-${j}`}
            x1={lx + 8} y1={inputY(i)}
            x2={hx - 8} y2={hiddenY(j)}
            stroke={hidden[j] > 0.3 ? activeEdge : edgeColor}
            strokeWidth={hidden[j] > 0.5 ? 1.5 : 0.8}
            className="transition-all duration-700"
          />
        ))
      )}

      {/* Edges: hidden → outputs */}
      {Array.from({ length: hiddenCount }, (_, j) =>
        outputLabels.map((_, k) => (
          <line
            key={`ho-${j}-${k}`}
            x1={hx + 8} y1={hiddenY(j)}
            x2={ox - 8} y2={outputY(k)}
            stroke={hidden[j] > 0.3 ? activeEdge : edgeColor}
            strokeWidth={hidden[j] > 0.5 ? 1.5 : 0.8}
            className="transition-all duration-700"
          />
        ))
      )}

      {/* Input nodes */}
      {inputLabels.map((label, i) => (
        <g key={`in-${i}`}>
          <circle
            cx={lx} cy={inputY(i)} r={7}
            fill={nodeColor} opacity={0.85}
            className="neural-node"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
          <text
            x={lx - 10} y={inputY(i) + 1}
            textAnchor="end" fontSize={8}
            fill={isDark ? "#94a3b8" : "#64748b"}
            dominantBaseline="middle"
          >{label}</text>
        </g>
      ))}

      {/* Hidden nodes */}
      {Array.from({ length: hiddenCount }, (_, j) => {
        const activation = hidden[j];
        const alpha = 0.3 + activation * 0.7;
        return (
          <g key={`h-${j}`}>
            <circle
              cx={hx} cy={hiddenY(j)} r={9}
              fill={`rgba(99,102,241,${alpha})`}
              stroke={nodeColor}
              strokeWidth={1.5}
              className="neural-node"
              style={{ animationDelay: `${j * 0.3}s` }}
            />
            <text x={hx} y={hiddenY(j)} textAnchor="middle" fontSize={6}
              fill="white" dominantBaseline="middle" fontWeight="bold">
              {(activation).toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Output nodes */}
      {outputLabels.map((label, k) => (
        <g key={`out-${k}`}>
          <circle
            cx={ox} cy={outputY(k)} r={10}
            fill={k === 0 ? "#10b981" : "#f43f5e"}
            opacity={0.9}
            className="neural-node"
            style={{ animationDelay: `${k * 0.4}s` }}
          />
          <text x={ox + 14} y={outputY(k)} fontSize={8}
            fill={isDark ? "#94a3b8" : "#64748b"}
            dominantBaseline="middle">{label}</text>
        </g>
      ))}

      {/* Layer labels */}
      {[
        { x: lx, label: "Input" },
        { x: hx, label: "Oculta" },
        { x: ox, label: "Output" },
      ].map(({ x, label }) => (
        <text key={label} x={x} y={h - 4} textAnchor="middle" fontSize={8}
          fill={isDark ? "#475569" : "#94a3b8"} fontWeight="600">{label}</text>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface FinanceAIProps {
  history: HistorySnapshot[];
  assets: FinanceItem[];
  liabilities: FinanceItem[];
  isDark: boolean;
}

export default function FinanceAI({ history, assets, liabilities, isDark }: FinanceAIProps) {
  const [showDetails, setShowDetails] = useState(false);

  const { features, raw, result, health, predictedBalance } = useMemo(() => {
    const { features, raw } = extractFeatures(history, assets, liabilities);
    const result = forwardPass(features);

    const balanceScore = result.outputs[0];
    const riskScore    = result.outputs[1];
    const health       = classifyHealth(balanceScore, riskScore);

    // Predict next month's balance
    const totalAssets = assets.reduce((s, i) => s + i.amount, 0);
    const totalLiabilities = liabilities.reduce((s, i) => s + i.amount, 0);
    const currentNet = totalAssets - totalLiabilities;

    // Growth multiplier based on network output (balanceScore drives optimism)
    const growthFactor = (balanceScore - 0.5) * 0.15; // ±7.5% range
    const predictedBalance = currentNet * (1 + growthFactor);

    return { features, raw, result, health, predictedBalance };
  }, [history, assets, liabilities]);

  const hasData = assets.length > 0 || liabilities.length > 0;

  return (
    <div className="space-y-4" id="ai-section">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
          <Brain className="text-indigo-500 w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold section-title gradient-text-purple">
            FinanceAI
          </h3>
          <p className="text-xs text-default-400 mt-1">
            Red Neuronal Artificial · Materia 02LIC0805
          </p>
        </div>
      </div>

      {!hasData ? (
        <Card className="glass border-indigo-500/20">
          <CardBody className="py-10 text-center text-default-400">
            <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Agrega activos o gastos para que la red neuronal pueda analizar tus finanzas.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

          {/* Left: Health card + Prediction */}
          <div className="md:col-span-4 flex flex-col gap-4">

            {/* Health Status */}
            <Card className={`glass card-hover border-0 glow-${health.color === 'success' ? 'emerald' : health.color === 'danger' ? 'rose' : 'purple'}`}>
              <CardBody className="p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-default-400 mb-2">
                  Salud Financiera
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{health.emoji}</span>
                  <div>
                    <Chip
                      color={health.color}
                      variant="shadow"
                      size="lg"
                      className="font-bold text-sm"
                    >
                      {health.status}
                    </Chip>
                  </div>
                </div>
                <p className="text-xs text-default-500 leading-relaxed">{health.description}</p>
              </CardBody>
            </Card>

            {/* Predicted Balance */}
            <Card className="glass card-hover border-indigo-500/20">
              <CardBody className="p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-default-400 mb-1">
                  Predicción próximo mes
                </p>
                <p className="text-xs text-default-400 mb-3">Basada en la red neuronal</p>
                <div className="flex items-center gap-2">
                  {predictedBalance >= 0 ? (
                    <TrendingUp className="text-emerald-500 w-5 h-5 shrink-0" />
                  ) : (
                    <TrendingDown className="text-rose-500 w-5 h-5 shrink-0" />
                  )}
                  <span className={`text-2xl font-extrabold font-mono ${
                    predictedBalance >= 0 ? "text-emerald-500" : "text-rose-500"
                  }`}>
                    ${Math.abs(predictedBalance).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="mt-3 text-xs text-default-400 flex items-start gap-1.5">
                  <Info size={12} className="shrink-0 mt-0.5 text-indigo-400" />
                  <span>La red ajusta esta estimación según tu ratio de ahorro, deuda y tendencia histórica.</span>
                </div>
              </CardBody>
            </Card>

            {/* Neural scores */}
            <Card className="glass card-hover border-indigo-500/20">
              <CardBody className="p-5 space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-default-400">
                  Salidas de la Red
                </p>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-default-500">Score de Balance</span>
                    <span className="font-mono font-bold text-emerald-500">
                      {(result.outputs[0] * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={result.outputs[0] * 100}
                    color="success"
                    size="sm"
                    className="mb-1"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-default-500">Índice de Riesgo</span>
                    <span className="font-mono font-bold text-rose-500">
                      {(result.outputs[1] * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={result.outputs[1] * 100}
                    color="danger"
                    size="sm"
                  />
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Right: Neural Diagram + Features */}
          <div className="md:col-span-8 flex flex-col gap-4">

            {/* Neural Diagram */}
            <Card className="glass card-hover border-indigo-500/20 flex-1">
              <CardHeader className="pb-0">
                <div>
                  <h4 className="font-bold text-sm">Arquitectura de la Red</h4>
                  <p className="text-xs text-default-400">5 entradas → 4 neuronas ocultas (ReLU) → 2 salidas (Sigmoid)</p>
                </div>
              </CardHeader>
              <CardBody className="pt-2">
                <NeuralDiagram hidden={result.hidden} isDark={isDark} />

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {[
                    { color: "bg-indigo-500", label: "Nodo activo" },
                    { color: "bg-emerald-500", label: "Output balance" },
                    { color: "bg-rose-500",    label: "Output riesgo" },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-default-400">
                      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                      {label}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Input Features */}
            <Card className="glass card-hover border-indigo-500/20">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <h4 className="font-bold text-sm">Variables de Entrada</h4>
                    <p className="text-xs text-default-400">Características financieras normalizadas</p>
                  </div>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => setShowDetails(!showDetails)}
                    aria-label="Expandir detalles"
                  >
                    {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </Button>
                </div>
              </CardHeader>
              <CardBody className="pt-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: "Tasa de Ahorro",    value: raw.savingsRate,   unit: "%",  color: "emerald", desc: "% de ingresos que se conservan" },
                    { label: "Ratio de Deuda",     value: raw.debtRatio,    unit: "%",  color: "rose",    desc: "Deuda vs Activos totales" },
                    { label: "Crecimiento",        value: raw.assetGrowth,  unit: "%",  color: "blue",    desc: "Variación histórica de activos" },
                    { label: "% Apartado",         value: raw.bucketPct,    unit: "%",  color: "amber",   desc: "Fondos reservados vs activos" },
                    { label: "Ratio Liquidez",     value: raw.liquidityRatio, unit: "x", color: "purple", desc: "Activos / Pasivos" },
                  ].map(({ label, value, unit, color, desc }) => (
                    <div
                      key={label}
                      className={`p-3 rounded-xl bg-${color === 'blue' ? 'blue' : color === 'purple' ? 'purple' : color}-500/10 border border-${color === 'blue' ? 'blue' : color === 'purple' ? 'purple' : color}-500/20`}
                    >
                      <p className={`text-xs font-bold text-${color === 'blue' ? 'blue' : color === 'purple' ? 'indigo' : color}-600 dark:text-${color === 'blue' ? 'blue' : color === 'purple' ? 'indigo' : color}-400`}>
                        {label}
                      </p>
                      <p className="text-lg font-extrabold font-mono">
                        {typeof value === 'number' ? value.toFixed(1) : '—'}{unit}
                      </p>
                      {showDetails && (
                        <p className="text-xs text-default-400 mt-1 animate-fade-in-up">{desc}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Educational Footer */}
          <div className="md:col-span-12">
            <Card className="glass border-indigo-500/15">
              <CardBody className="py-3 px-5">
                <div className="flex items-start gap-3">
                  <Zap className="text-indigo-400 w-4 h-4 mt-0.5 shrink-0" />
                  <p className="text-xs text-default-500 leading-relaxed">
                    <span className="font-bold text-indigo-500">¿Cómo funciona?</span>{" "}
                    Esta red neuronal feedforward procesa 5 indicadores financieros como entradas.
                    En la capa oculta, 4 neuronas aplican la función de activación <code className="bg-default-100 px-1 rounded text-indigo-500">ReLU(x) = max(0,x)</code> para detectar patrones no lineales.
                    Finalmente, la capa de salida usa <code className="bg-default-100 px-1 rounded text-emerald-500">Sigmoid(x) = 1/(1+e⁻ˣ)</code> para producir probabilidades entre 0 y 1.
                    Esto modela conceptos de <strong>02LIC0805 — Redes Neuronales Artificiales</strong>.
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
