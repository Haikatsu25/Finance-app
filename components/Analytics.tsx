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
    Legend
} from "recharts";
import { Card, CardHeader, CardBody } from "@heroui/react";
import { HistorySnapshot, FinanceItem } from "@/types";

interface AnalyticsProps {
    history: HistorySnapshot[];
    assets: FinanceItem[];
    liabilities: FinanceItem[];
    isDark: boolean;
}

export default function Analytics({ history, assets, liabilities, isDark }: AnalyticsProps) {

    // Prepare Trend Data
    const trendData = [...history].reverse().map(h => ({
        date: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        available: h.available,
        assets: h.totalAssets,
        liabilities: h.totalLiabilities
    }));

    // Prepare Distribution Data
    const getCategoryData = (items: FinanceItem[]) => {
        const map = new Map<string, number>();
        items.forEach(i => {
            const cat = i.category || 'Otros';
            map.set(cat, (map.get(cat) || 0) + i.amount);
        });
        return Array.from(map, ([name, value]) => ({ name, value }));
    };

    const assetDist = getCategoryData(assets);
    const liabilityDist = getCategoryData(liabilities);

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="analytics-section">
            {/* Trend Chart */}
            <Card className="col-span-1 md:col-span-2 bg-content1 shadow-md border border-divider">
                <CardHeader>
                    <h3 className="text-lg font-bold">Tendencia de Patrimonio</h3>
                </CardHeader>
                <CardBody className="h-[300px] w-full">
                    {trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey="date" stroke={isDark ? '#888' : '#666'} fontSize={12} />
                                <YAxis
                                    stroke={isDark ? '#888' : '#666'}
                                    fontSize={12}
                                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: isDark ? '#18181b' : '#fff', borderRadius: '8px', border: 'none' }}
                                    itemStyle={{ color: isDark ? '#e4e4e7' : '#18181b' }}
                                    formatter={(value: any, name: any) => [`$${Number(value).toLocaleString()}`, name]}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="assets" stroke="#3b82f6" strokeWidth={3} name="Total Activos" dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="liabilities" stroke="#ef4444" strokeWidth={3} name="Total Deudas" dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="available" stroke="#10b981" strokeWidth={3} name="Disponible Restante" dot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-default-400">
                            Guarda algunos snapshots para ver tu tendencia.
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Assets Distribution */}
            <Card className="bg-content1 shadow-md border border-divider">
                <CardHeader>
                    <h3 className="text-lg font-bold">Distribución de Activos</h3>
                </CardHeader>
                <CardBody className="h-[300px] w-full">
                    {assetDist.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={assetDist}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {assetDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-default-400">
                            Agrega activos para ver la distribución.
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Liability Distribution */}
            <Card className="bg-content1 shadow-md border border-divider">
                <CardHeader>
                    <h3 className="text-lg font-bold">Distribución de Gastos</h3>
                </CardHeader>
                <CardBody className="h-[300px] w-full">
                    {liabilityDist.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={liabilityDist}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {liabilityDist.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-default-400">
                            Agrega gastos/deudas para ver la distribución.
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
