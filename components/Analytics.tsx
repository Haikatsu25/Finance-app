"use client";

import React from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
    AreaChart,
    Area,
    BarChart,
    Bar,
    TooltipProps,
} from "recharts";
import { Card, CardHeader, CardBody } from "@heroui/react";
import { HistorySnapshot, FinanceItem } from "@/types";
import { TrendingUp, PieChart as PieIcon, BarChart2 } from "lucide-react";

interface AnalyticsProps {
    history: HistorySnapshot[];
    assets: FinanceItem[];
    liabilities: FinanceItem[];
    isDark: boolean;
}

// ─────────────────────────────────────────
// Custom Tooltip
// ─────────────────────────────────────────
function CustomTooltip({ active, payload, label, isDark }: TooltipProps<number, string> & { isDark: boolean }) {
    if (!active || !payload?.length) return null;
    return (
        <div
            className="rounded-xl p-3 text-xs shadow-xl border"
            style={{
                background: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.97)",
                borderColor: isDark ? "rgba(99,102,241,0.3)" : "rgba(226,232,240,0.8)",
                backdropFilter: "blur(12px)",
            }}
        >
            <p className="font-bold text-default-500 mb-2">{label}</p>
            {payload.map((p) => (
                <div key={p.name} className="flex items-center gap-2 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                    <span className="text-default-500">{p.name}:</span>
                    <span className="font-mono font-bold" style={{ color: p.color }}>
                        ${Number(p.value).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </span>
                </div>
            ))}
        </div>
    );
}

function PieTooltip({ active, payload, isDark }: TooltipProps<number, string> & { isDark: boolean }) {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
        <div
            className="rounded-xl p-3 text-xs shadow-xl border"
            style={{
                background: isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.97)",
                borderColor: isDark ? "rgba(99,102,241,0.3)" : "rgba(226,232,240,0.8)",
                backdropFilter: "blur(12px)",
            }}
        >
            <p className="font-bold" style={{ color: d.payload.fill }}>{d.name}</p>
            <p className="font-mono font-bold mt-1">${Number(d.value).toLocaleString()}</p>
        </div>
    );
}

const ASSET_COLORS    = ["#10b981", "#06b6d4", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899"];
const LIAB_COLORS     = ["#f43f5e", "#fb923c", "#ef4444", "#f97316", "#dc2626", "#b91c1c"];
const TICK_STYLE      = (dark: boolean) => ({ fontSize: 11, fill: dark ? "#64748b" : "#94a3b8" });

function EmptyChart({ message }: { message: string }) {
    return (
        <div className="h-full flex flex-col items-center justify-center gap-2 text-default-300">
            <BarChart2 size={32} className="opacity-30" />
            <p className="text-sm">{message}</p>
        </div>
    );
}

export default function Analytics({ history, assets, liabilities, isDark }: AnalyticsProps) {
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
    const getCategoryData = (items: FinanceItem[]) => {
        const map = new Map<string, number>();
        items.forEach((i) => {
            const cat = i.category || "Otros";
            map.set(cat, (map.get(cat) || 0) + i.amount);
        });
        return Array.from(map, ([name, value]) => ({ name, value }));
    };

    const assetDist   = getCategoryData(assets);
    const liabilityDist = getCategoryData(liabilities);

    // ── Monthly bar comparison ───────────────────────────────────
    const barData = trendData.slice(-6); // Last 6 snapshots

    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

    return (
        <div className="space-y-4" id="analytics-section">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <TrendingUp className="text-blue-500 w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-xl font-bold section-title gradient-text-emerald">
                        Analíticas
                    </h3>
                    <p className="text-xs text-default-400 mt-1">Tendencias y distribución de tu patrimonio</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* ── AREA TREND CHART ────────────────────────── */}
                <Card className="col-span-1 md:col-span-2 glass card-hover border-0">
                    <CardHeader className="pb-1">
                        <h4 className="font-bold text-sm">Tendencia de Patrimonio</h4>
                    </CardHeader>
                    <CardBody className="h-[260px] sm:h-[300px] w-full pt-0">
                        {trendData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradActivos" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                        </linearGradient>
                                        <linearGradient id="gradDisponible" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                                        </linearGradient>
                                        <linearGradient id="gradDeudas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke={gridColor} strokeDasharray="4 4" />
                                    <XAxis dataKey="date" tick={TICK_STYLE(isDark)} axisLine={false} tickLine={false} />
                                    <YAxis
                                        tick={TICK_STYLE(isDark)}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                                        width={52}
                                    />
                                    <Tooltip content={<CustomTooltip isDark={isDark} />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                                        iconType="circle"
                                        iconSize={8}
                                    />
                                    <Area type="monotone" dataKey="Activos"    stroke="#10b981" strokeWidth={2.5} fill="url(#gradActivos)"    dot={false} activeDot={{ r: 5 }} />
                                    <Area type="monotone" dataKey="Disponible" stroke="#06b6d4" strokeWidth={2.5} fill="url(#gradDisponible)" dot={false} activeDot={{ r: 5 }} />
                                    <Area type="monotone" dataKey="Deudas"     stroke="#f43f5e" strokeWidth={2}   fill="url(#gradDeudas)"     dot={false} activeDot={{ r: 5 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChart message="Guarda snapshots para ver tu tendencia" />
                        )}
                    </CardBody>
                </Card>

                {/* ── BAR CHART — monthly comparison ──────────── */}
                <Card className="glass card-hover border-0">
                    <CardHeader className="pb-1">
                        <h4 className="font-bold text-sm">Comparación Mensual</h4>
                    </CardHeader>
                    <CardBody className="h-[240px] w-full pt-0">
                        {barData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }} barGap={2}>
                                    <CartesianGrid stroke={gridColor} strokeDasharray="4 4" vertical={false} />
                                    <XAxis dataKey="date" tick={TICK_STYLE(isDark)} axisLine={false} tickLine={false} />
                                    <YAxis
                                        tick={TICK_STYLE(isDark)}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`}
                                        width={48}
                                    />
                                    <Tooltip content={<CustomTooltip isDark={isDark} />} />
                                    <Legend wrapperStyle={{ fontSize: "11px" }} iconType="circle" iconSize={8} />
                                    <Bar dataKey="Activos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                    <Bar dataKey="Deudas"  fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChart message="Guarda snapshots para comparar meses" />
                        )}
                    </CardBody>
                </Card>

                {/* ── PIE: Assets ─────────────────────────────── */}
                <Card className="glass card-hover border-0">
                    <CardHeader className="pb-1">
                        <h4 className="font-bold text-sm">Distribución de Activos</h4>
                    </CardHeader>
                    <CardBody className="h-[240px] w-full pt-0">
                        {assetDist.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={assetDist}
                                        cx="50%" cy="48%"
                                        innerRadius="42%"
                                        outerRadius="62%"
                                        paddingAngle={4}
                                        dataKey="value"
                                        strokeWidth={0}
                                    >
                                        {assetDist.map((_, i) => (
                                            <Cell key={i} fill={ASSET_COLORS[i % ASSET_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip isDark={isDark} />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: "11px" }}
                                        iconType="circle"
                                        iconSize={8}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChart message="Agrega activos para ver distribución" />
                        )}
                    </CardBody>
                </Card>

                {/* ── PIE: Liabilities ────────────────────────── */}
                <Card className="glass card-hover border-0">
                    <CardHeader className="pb-1">
                        <h4 className="font-bold text-sm">Distribución de Gastos</h4>
                    </CardHeader>
                    <CardBody className="h-[240px] w-full pt-0">
                        {liabilityDist.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={liabilityDist}
                                        cx="50%" cy="48%"
                                        innerRadius="42%"
                                        outerRadius="62%"
                                        paddingAngle={4}
                                        dataKey="value"
                                        strokeWidth={0}
                                    >
                                        {liabilityDist.map((_, i) => (
                                            <Cell key={i} fill={LIAB_COLORS[i % LIAB_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip isDark={isDark} />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: "11px" }}
                                        iconType="circle"
                                        iconSize={8}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChart message="Agrega gastos para ver distribución" />
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
