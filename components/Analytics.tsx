"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    Line,
    BarChart,
    Bar,
    LabelList,
} from "recharts";
import { HistorySnapshot, FinanceItem, TransactionItem } from "@/types";
import { BarChart2 } from "lucide-react";
import { money, round2 } from "@/lib/format";
import { monthKey, monthLabel, spentByCategory, summarizeMonth, shiftMonth } from "@/lib/finance-utils";

interface AnalyticsProps {
    history: HistorySnapshot[];
    assets: FinanceItem[];
    transactions: TransactionItem[];
}

// ─────────────────────────────────────────
// Colores de las gráficas. Los atributos SVG de Recharts no resuelven var(), así que se leen
// ya resueltos de los tokens (y se releen al cambiar de tema). Nunca se hereda el stroke de los
// íconos: cada serie declara el suyo y los ejes no llevan ninguno.
// ─────────────────────────────────────────
type ChartColors = { pop1: string; pop3: string; pop4: string; ink: string; mute: string; card: string; line: string };
const FALLBACK: ChartColors = { pop1: "#2f9e8f", pop3: "#3b82f6", pop4: "#e7772b", ink: "#0e1a33", mute: "#6b7590", card: "#ffffff", line: "rgba(14,26,51,.07)" };

function useChartColors(): ChartColors {
    const { resolvedTheme } = useTheme();
    const [colors, setColors] = useState<ChartColors>(FALLBACK);
    useEffect(() => {
        const cs = getComputedStyle(document.documentElement);
        const v = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
        setColors({
            pop1: v("--pop1", FALLBACK.pop1), pop3: v("--pop3", FALLBACK.pop3), pop4: v("--pop4", FALLBACK.pop4),
            ink: v("--ink", FALLBACK.ink), mute: v("--ink-soft", FALLBACK.mute),
            card: v("--card-bg", FALLBACK.card), line: v("--rule", FALLBACK.line),
        });
    }, [resolvedTheme]);
    return colors;
}

const FONT = "var(--font-jakarta), system-ui, sans-serif";

/** Escalón "bonito" (1, 2, 2.5, 5 × 10ⁿ) para tener unas 4 marcas en el eje Y */
function niceStep(max: number): number {
    if (max <= 0) return 1;
    const raw = max / 4;
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function niceTicks(max: number): number[] {
    const step = niceStep(max);
    const out: number[] = [0];
    for (let v = step; v <= max * 1.001 + step; v += step) {
        out.push(round2(v));
        if (v >= max) break;
    }
    return out;
}

const compactAxis = (v: number) => (v === 0 ? "0" : v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : String(Math.round(v)));
const barLabel = (raw: unknown) => { const v = Number(raw); return (v > 0 ? (v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(Math.round(v))) : ""); };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Tooltip: tarjeta plana
function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="pop-card text-xs" style={{ padding: 12 }}>
            <p className="font-bold mb-2">{label}</p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center gap-2 mb-1">
                    <span className="size-2.5 rounded-full shrink-0" style={{ background: p.color || p.stroke || p.fill }} aria-hidden />
                    <span className="mute">{p.name}</span>
                    <span className="tnum font-bold ml-auto pl-4">{money(Number(p.value))}</span>
                </div>
            ))}
        </div>
    );
}

function EmptyChart({ message }: { message: string }) {
    return (
        <div className="empty flex flex-col items-center justify-center gap-2" style={{ minHeight: 140 }}>
            <BarChart2 size={28} className="opacity-40" aria-hidden />
            <p>{message}</p>
        </div>
    );
}

// ─────────────────────────────────────────
// Distribución por categoría: barras horizontales ordenadas, con su monto y su % a la derecha.
// Más de 8 categorías: las menores se juntan en "Otros".
// ─────────────────────────────────────────
type Row = { name: string; value: number };
const MAX_ROWS = 8;

function groupRows(items: Row[]): Row[] {
    const positive = items.filter((r) => r.value > 0).sort((a, b) => b.value - a.value);
    const otros = positive.find((r) => r.name === "Otros")?.value ?? 0;
    const named = positive.filter((r) => r.name !== "Otros");

    if (named.length + (otros > 0 ? 1 : 0) <= MAX_ROWS) {
        return otros > 0 ? [...named, { name: "Otros", value: otros }] : named;
    }
    const head = named.slice(0, MAX_ROWS - 1);
    const rest = named.slice(MAX_ROWS - 1).reduce((s, r) => s + r.value, otros);
    return [...head, { name: "Otros", value: round2(rest) }];
}

function pctText(share: number): string {
    if (share < 1) return "<1%";
    return `${Math.round(share)}%`;
}

function DistributionBars({ rows, tone }: { rows: Row[]; tone?: "out" }) {
    const total = rows.reduce((s, r) => s + r.value, 0);
    return (
        <div className="hbars">
            {rows.map((r) => (
                <div key={r.name} className={`hb ${tone ?? ""}`}>
                    <div className="l">
                        <b className="truncate">{r.name}</b>
                        <span>{money(r.value)}<small>{pctText((r.value / total) * 100)}</small></span>
                    </div>
                    <div className="tr" aria-hidden><span style={{ width: `${(r.value / total) * 100}%` }} /></div>
                </div>
            ))}
        </div>
    );
}

export default function Analytics({ history, assets, transactions }: AnalyticsProps) {
    const c = useChartColors();

    // ── Tendencia: los snapshots, del más viejo al más nuevo ──────
    const trendData = [...history]
        .reverse()
        .map((h) => ({
            date: new Date(h.date).toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
            Activos:   h.totalAssets,
            Deudas:    h.totalLiabilities,
            Apartados: h.totalBuckets,
            Disponible: h.available,
        }));
    const topValue = Math.max(0, ...trendData.map((d) => Math.max(d.Activos, d.Deudas, d.Apartados)));
    const trendTicks = niceTicks(topValue || 1);
    const lastIdx = trendData.length - 1;

    // ── Distribuciones ───────────────────────────────────────────
    const assetMap = new Map<string, number>();
    assets.forEach((i) => assetMap.set(i.category || "Otros", (assetMap.get(i.category || "Otros") || 0) + i.amount));
    const assetDist = groupRows(Array.from(assetMap, ([name, value]) => ({ name, value })));
    const assetTotal = assetDist.reduce((s, r) => s + r.value, 0);

    // Gastos del mes en curso, por categoría (movimientos de tipo gasto, no la lista de deudas)
    const currentMonth = monthKey(new Date());
    const expenseDist = groupRows(Array.from(spentByCategory(transactions, currentMonth), ([name, value]) => ({ name, value })));
    const expenseTotal = expenseDist.reduce((s, r) => s + r.value, 0);

    // ── Comparación mensual: ingresos y gastos de los últimos 3 meses ──
    const months = [2, 1, 0].map((k) => {
        const key = shiftMonth(currentMonth, -k);
        const s = summarizeMonth(transactions, key);
        return { key, mes: cap(monthLabel(key).split(" ")[0].slice(0, 3)), Ingresos: s.income, Gastos: s.expense };
    });
    const thisMonth = months[2];

    // ── Resúmenes en texto: lo que dicen las gráficas, para quien no las ve ──
    const last = trendData[lastIdx];
    const prev = trendData[lastIdx - 1];
    const trendSummary = last
        ? (() => {
            const delta = prev && prev.Activos > 0
                ? `, ${last.Activos >= prev.Activos ? "+" : "−"}${Math.abs(((last.Activos - prev.Activos) / prev.Activos) * 100).toFixed(0)}% frente al snapshot anterior`
                : "";
            return `Activos ${money(last.Activos)}${delta}. Deudas ${money(last.Deudas)}, apartados ${money(last.Apartados)}.`;
        })()
        : "";
    const barSummary = `Este mes entró ${money(thisMonth.Ingresos)} y salió ${money(thisMonth.Gastos)}.`;

    const axisTick = { fontSize: 10, fontWeight: 600, fill: c.mute, fontFamily: FONT };

    return (
        <>
            <h2 className="wide sec sec-lg px-0.5" id="analytics-section">Análisis</h2>

            {/* ── Tendencia de patrimonio ─────────────────── */}
            <section className="pop-card chart-tokens">
                <div className="sec-h">
                    <h2 className="sec">Tendencia de patrimonio</h2>
                    <span className="chip">{trendData.length} snapshot{trendData.length === 1 ? "" : "s"}</span>
                </div>
                {trendData.length > 0 ? (
                    <>
                        <p className="summary tnum">{trendSummary}</p>
                        <div className="h-[200px] w-full" role="img" aria-label={`Tendencia de patrimonio. ${trendSummary}`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradActivos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={c.pop1} stopOpacity={0.32} />
                                            <stop offset="100%" stopColor={c.pop1} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke={c.line} strokeDasharray="3 4" vertical={false} />
                                    <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={compactAxis} width={40}
                                        ticks={trendTicks} domain={[0, trendTicks[trendTicks.length - 1]]} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey="Activos" stroke={c.pop1} strokeWidth={3} fill="url(#gradActivos)"
                                        dot={(p: any) => p.index === lastIdx
                                            ? <circle key="end-a" cx={p.cx} cy={p.cy} r={5} fill={c.pop1} stroke={c.card} strokeWidth={2.5} />
                                            : <g key={`a${p.index}`} />}
                                        activeDot={{ r: 5, fill: c.pop1, stroke: c.card, strokeWidth: 2 }} />
                                    <Line type="monotone" dataKey="Deudas" stroke={c.pop4} strokeWidth={2} dot={(p: any) => p.index === lastIdx
                                        ? <circle key="end-d" cx={p.cx} cy={p.cy} r={5} fill={c.pop4} stroke={c.card} strokeWidth={2.5} />
                                        : <g key={`d${p.index}`} />} />
                                    <Line type="monotone" dataKey="Apartados" stroke={c.pop3} strokeWidth={2} dot={(p: any) => p.index === lastIdx
                                        ? <circle key="end-b" cx={p.cx} cy={p.cy} r={5} fill={c.pop3} stroke={c.card} strokeWidth={2.5} />
                                        : <g key={`b${p.index}`} />} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        <ul className="legend" style={{ gridTemplateColumns: "repeat(3, auto)", justifyContent: "start", gap: 14 }}>
                            <li style={{ ["--c" as string]: "var(--pop1)" }}>Activos</li>
                            <li style={{ ["--c" as string]: "var(--pop4)" }}>Deudas</li>
                            <li style={{ ["--c" as string]: "var(--pop3)" }}>Apartados</li>
                        </ul>
                    </>
                ) : (
                    <EmptyChart message="Guarda snapshots para ver tu tendencia" />
                )}
            </section>

            {/* ── Comparación mensual ─────────────────────── */}
            <section className="pop-card chart-tokens">
                <div className="sec-h">
                    <h2 className="sec">Comparación mensual</h2>
                    <span className="chip">3 meses</span>
                </div>
                <p className="summary tnum">{barSummary}</p>
                <div className="h-[190px] w-full" role="img" aria-label={`Ingresos y gastos por mes. ${barSummary}`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={months} margin={{ top: 18, right: 8, left: 8, bottom: 0 }} barGap={6}>
                            <XAxis dataKey="mes" tick={{ ...axisTick, fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis hide domain={[0, (max: number) => Math.max(max * 1.1, 1)]} />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: c.line }} />
                            <Bar dataKey="Ingresos" fill={c.pop1} radius={[10, 10, 0, 0]} maxBarSize={38} minPointSize={4}>
                                <LabelList dataKey="Ingresos" position="top" formatter={barLabel}
                                    style={{ fontSize: 10, fontWeight: 700, fill: c.ink, fontFamily: FONT, stroke: "none" }} />
                            </Bar>
                            <Bar dataKey="Gastos" fill={c.pop4} radius={[10, 10, 0, 0]} maxBarSize={38} minPointSize={4}>
                                <LabelList dataKey="Gastos" position="top" formatter={barLabel}
                                    style={{ fontSize: 10, fontWeight: 700, fill: c.ink, fontFamily: FONT, stroke: "none" }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <ul className="legend" style={{ gridTemplateColumns: "repeat(2, auto)", justifyContent: "start", gap: 14 }}>
                    <li style={{ ["--c" as string]: "var(--pop1)" }}>Ingresos</li>
                    <li style={{ ["--c" as string]: "var(--pop4)" }}>Gastos</li>
                </ul>
            </section>

            {/* ── Distribución de activos ─────────────────── */}
            <section className="pop-card">
                <div className="sec-h">
                    <h2 className="sec">Distribución de activos</h2>
                    {assetDist.length > 0 && <span className="chip tnum">{money(assetTotal)}</span>}
                </div>
                {assetDist.length > 0 ? (
                    <DistributionBars rows={assetDist} />
                ) : (
                    <div className="empty">Agrega activos para ver la distribución.</div>
                )}
            </section>

            {/* ── Distribución de gastos ──────────────────── */}
            <section className="pop-card">
                <div className="sec-h">
                    <h2 className="sec">Distribución de gastos</h2>
                    <span className="chip tnum">{expenseDist.length > 0 ? money(expenseTotal) : cap(monthLabel(currentMonth).split(" ")[0])}</span>
                </div>
                {expenseDist.length > 0 ? (
                    <DistributionBars rows={expenseDist} tone="out" />
                ) : (
                    <div className="empty">Aún no hay gastos este mes.</div>
                )}
            </section>
        </>
    );
}
