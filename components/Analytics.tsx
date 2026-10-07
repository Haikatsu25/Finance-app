"use client";

import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    AreaChart,
    Area,
    BarChart,
    Bar,
} from "recharts";
import { Card, CardHeader, CardBody } from "@heroui/react";
import { HistorySnapshot, FinanceItem, TransactionItem } from "@/types";
import { BarChart2 } from "lucide-react";
import { money, round2 } from "@/lib/format";
import { monthKey, monthLabel, spentByCategory } from "@/lib/finance-utils";

interface AnalyticsProps {
    history: HistorySnapshot[];
    assets: FinanceItem[];
    transactions: TransactionItem[];
}

// Valores de los tokens de dinero (los atributos SVG de recharts no resuelven var())
const IN = "#059669";
const OUT = "#e11d48";
const INK = "var(--ink)";

// ─────────────────────────────────────────
// Tooltip: panel plano, sin desenfoque ni sombra
// ─────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg p-3 text-xs border border-(--card-border) bg-(--card-bg)">
            <p className="font-bold mb-2">{label}</p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color }} aria-hidden />
                    <span className="text-default-600">{p.name}</span>
                    <span className="tnum font-bold ml-auto pl-4">{money(Number(p.value))}</span>
                </div>
            ))}
        </div>
    );
}

const compactAxis = (v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`;

function EmptyChart({ message }: { message: string }) {
    return (
        <div className="h-full flex flex-col items-center justify-center gap-2 text-default-500">
            <BarChart2 size={32} className="opacity-40" aria-hidden />
            <p className="text-sm">{message}</p>
        </div>
    );
}

// ─────────────────────────────────────────
// Distribución por categoría: barras ordenadas, no donas.
// Cada barra lleva su etiqueta, su monto y su % a la derecha; se lee sin leyenda
// y sin depender del color. Más de 8 categorías: las menores se juntan en "Otros".
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

// Barras en tinta y el color del flujo en el total de la tarjeta: contra su pista dan
// 12:1 (claro) y 11:1 (oscuro); las rojas/verdes atenuadas al 60% daban 2.0:1 y 1.5:1.
function DistributionBars({ rows }: { rows: Row[] }) {
    const total = rows.reduce((s, r) => s + r.value, 0);
    const max = Math.max(...rows.map((r) => r.value));

    return (
        <ul className="space-y-3">
            {rows.map((r) => {
                return (
                    <li key={r.name}>
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-sm font-semibold truncate">{r.name}</span>
                            <span className="shrink-0 flex items-baseline gap-2">
                                <span className="figure text-[1.2rem]">{money(r.value)}</span>
                                <span className="text-xs text-default-600 tnum min-w-[2.6rem] text-right">{pctText((r.value / total) * 100)}</span>
                            </span>
                        </div>
                        <div className="h-2.5 rounded-sm bg-default-200 mt-1 overflow-hidden" aria-hidden>
                            <div className="h-full rounded-sm bg-foreground" style={{ width: `${(r.value / max) * 100}%` }} />
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

export default function Analytics({ history, assets, transactions }: AnalyticsProps) {
    // ── Trend data from history ──────────────────────────────────
    const trendData = [...history]
        .reverse()
        .map((h) => ({
            date: new Date(h.date).toLocaleDateString("es-MX", { month: "short", day: "numeric" }),
            Activos:     h.totalAssets,
            Deudas:      h.totalLiabilities,
            Apartados:   h.totalBuckets,
            Disponible:  h.available,
        }));

    // ── Category distribution ────────────────────────────────────
    const getCategoryData = (items: FinanceItem[]): Row[] => {
        const map = new Map<string, number>();
        items.forEach((i) => {
            const cat = i.category || "Otros";
            map.set(cat, (map.get(cat) || 0) + i.amount);
        });
        return groupRows(Array.from(map, ([name, value]) => ({ name, value })));
    };

    const assetDist     = getCategoryData(assets);
    // Gastos del mes en curso, por categoría (los movimientos de tipo gasto, no la lista de deudas)
    const currentMonth = monthKey(new Date());
    const liabilityDist = groupRows(Array.from(spentByCategory(transactions, currentMonth), ([name, value]) => ({ name, value })));
    const assetTotal     = assetDist.reduce((s, r) => s + r.value, 0);
    const liabilityTotal = liabilityDist.reduce((s, r) => s + r.value, 0);

    // ── Monthly bar comparison ───────────────────────────────────
    const barData = trendData.slice(-6); // Last 6 snapshots

    // ── Resúmenes en texto: lo que dicen las gráficas, para quien no las ve ──
    const last = trendData[trendData.length - 1];
    const prev = trendData[trendData.length - 2];
    const trendSummary = last
        ? (() => {
            const delta = prev && prev.Activos > 0
                ? ` (${last.Activos >= prev.Activos ? "+" : "−"}${Math.abs(((last.Activos - prev.Activos) / prev.Activos) * 100).toFixed(0)}% frente al snapshot anterior)`
                : "";
            return `Activos ${money(last.Activos)}${delta}, deudas ${money(last.Deudas)}, disponible ${money(last.Disponible)}.`;
        })()
        : "";
    const barSummary = barData.length
        ? `En ${barData.length} snapshot${barData.length > 1 ? "s" : ""}: activos de ${money(barData[0].Activos)} a ${money(last.Activos)}, deudas de ${money(barData[0].Deudas)} a ${money(last.Deudas)}.`
        : "";

    return (
        <div className="space-y-4" id="analytics-section">
            {/* Section header */}
            <div className="mb-2">
                <h3 className="text-xl font-bold section-title">Analíticas</h3>
                <p className="text-xs text-default-500 mt-1">Tendencias y distribución de tu patrimonio</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* ── AREA TREND CHART ────────────────────────── */}
                <Card className="col-span-1 md:col-span-2 glass card-hover rule-ink shadow-none">
                    <CardHeader className="flex-col items-start pb-1 gap-1">
                        <h4 className="font-bold text-sm">Tendencia de patrimonio</h4>
                        {trendSummary && <p className="text-xs text-default-600 tnum">{trendSummary}</p>}
                    </CardHeader>
                    <CardBody className="chart-tokens h-[260px] sm:h-[300px] w-full pt-0">
                        {trendData.length > 0 ? (
                            <div className="h-full w-full" role="img" aria-label={`Tendencia de patrimonio. ${trendSummary}`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradActivos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor={IN} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={IN} stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradDeudas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor={OUT} stopOpacity={0.25} />
                                            <stop offset="95%" stopColor={OUT} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={compactAxis} width={52} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} iconType="plainline" iconSize={16} />
                                    <Area type="monotone" dataKey="Activos"    stroke={IN}  strokeWidth={2.5} fill="url(#gradActivos)" dot={false} activeDot={{ r: 5 }} />
                                    <Area type="monotone" dataKey="Deudas"     stroke={OUT} strokeWidth={2.5} fill="url(#gradDeudas)"  dot={false} activeDot={{ r: 5 }} />
                                    {/* Disponible no es un flujo: tinta y línea punteada (se distingue sin color) */}
                                    <Area type="monotone" dataKey="Disponible" stroke={INK} strokeWidth={2.5} strokeDasharray="6 4" fill="none" dot={false} activeDot={{ r: 5 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                            </div>
                        ) : (
                            <EmptyChart message="Guarda snapshots para ver tu tendencia" />
                        )}
                    </CardBody>
                </Card>

                {/* ── BAR CHART — monthly comparison ──────────── */}
                <Card className="col-span-1 md:col-span-2 glass card-hover rule-ink shadow-none">
                    <CardHeader className="flex-col items-start pb-1 gap-1">
                        <h4 className="font-bold text-sm">Comparación mensual</h4>
                        {barSummary && <p className="text-xs text-default-600 tnum">{barSummary}</p>}
                    </CardHeader>
                    <CardBody className="chart-tokens h-[240px] w-full pt-0">
                        {barData.length > 0 ? (
                            <div className="h-full w-full" role="img" aria-label={`Comparación mensual. ${barSummary}`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} barGap={2}>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} />
                                    <XAxis dataKey="date" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={compactAxis} width={48} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--rule)" }} />
                                    <Legend wrapperStyle={{ fontSize: "12px" }} iconType="square" iconSize={10} />
                                    <Bar dataKey="Activos" fill={IN}  radius={[3, 3, 0, 0]} maxBarSize={28} />
                                    <Bar dataKey="Deudas"  fill={OUT} radius={[3, 3, 0, 0]} maxBarSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                            </div>
                        ) : (
                            <EmptyChart message="Guarda snapshots para comparar meses" />
                        )}
                    </CardBody>
                </Card>

                {/* ── Distribución de activos ─────────────────── */}
                <Card className="glass card-hover rule-in shadow-none">
                    <CardHeader className="items-baseline justify-between gap-3 pb-2">
                        <h4 className="font-bold text-sm">Distribución de activos</h4>
                        {assetDist.length > 0 && (
                            <span className="figure text-[1.65rem] text-money-in-text">{money(assetTotal)}</span>
                        )}
                    </CardHeader>
                    <CardBody className="pt-1">
                        {assetDist.length > 0 ? (
                            <DistributionBars rows={assetDist} />
                        ) : (
                            <div className="h-[160px]"><EmptyChart message="Agrega activos para ver distribución" /></div>
                        )}
                    </CardBody>
                </Card>

                {/* ── Distribución de gastos ──────────────────── */}
                <Card className="glass card-hover rule-out shadow-none">
                    <CardHeader className="items-baseline justify-between gap-3 pb-2">
                        <div>
                            <h4 className="font-bold text-sm">Distribución de gastos</h4>
                            <p className="text-xs text-default-600">{monthLabel(currentMonth)}</p>
                        </div>
                        {liabilityDist.length > 0 && (
                            <span className="figure text-[1.65rem] text-money-out-text">{money(liabilityTotal)}</span>
                        )}
                    </CardHeader>
                    <CardBody className="pt-1">
                        {liabilityDist.length > 0 ? (
                            <DistributionBars rows={liabilityDist} />
                        ) : (
                            <div className="h-[160px]"><EmptyChart message="Aún no hay gastos este mes" /></div>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
