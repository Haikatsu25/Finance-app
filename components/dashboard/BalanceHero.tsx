"use client";

import React from "react";
import { Card, CardBody, Button } from "@heroui/react";
import { PiggyBank, TrendingUp, TrendingDown, Save, History, Database } from "lucide-react";
import { TransactionItem } from "@/types";
import { money, moneyParts } from "@/lib/format";
import { summarizeMonth } from "@/lib/finance-utils";

export function BalanceHero({
  isPositive, animatedAvailable, transactions, currentMonthKey,
  totalAssets, totalLiabilities, totalFixedCosts, totalMsiMonthly, balanceProgress,
  onSaveSnapshot, onViewHistory, onOpenSettings,
}: {
  isPositive: boolean;
  animatedAvailable: number;
  transactions: TransactionItem[];
  currentMonthKey: string;
  totalAssets: number;
  totalLiabilities: number;
  totalFixedCosts: number;
  totalMsiMonthly: number;
  balanceProgress: number;
  onSaveSnapshot: () => void;
  onViewHistory: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <Card
      id="balance-card"
      className={`col-span-1 md:col-span-8 border-0 overflow-hidden relative rounded-3xl ${
        isPositive
          ? "hero-card glow-hero-positive"
          : "hero-card-negative glow-hero-negative"
      }`}
    >
      {/* Anillos decorativos, como el grabado de una tarjeta metálica */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-white/10" />
      <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full border border-white/5" />
      <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full border border-white/5" />

      <CardBody className="relative z-10 py-6 px-5 sm:py-8 sm:px-7">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <PiggyBank size={16} className={isPositive ? "text-sky-400" : "text-rose-400"} />
            <p className="text-white/60 font-semibold text-xs tracking-[0.2em] uppercase">
              {isPositive ? "Disponible Real Este Mes" : "Déficit Este Mes"}
            </p>
          </div>
          <span className="text-[10px] font-bold tracking-widest text-white/40 border border-white/15 rounded-md px-2 py-0.5">
            MXN
          </span>
        </div>
        {(() => {
          const p = moneyParts(Math.abs(animatedAvailable));
          return (
            <h2 className={`text-5xl sm:text-7xl font-black tracking-tighter mb-2 tnum ${
              isPositive ? "neon-number" : "neon-number-negative"
            }`}>
              {!isPositive && "−"}{p.int}
              {!p.masked && p.cents && (
                <span className="text-2xl sm:text-4xl font-bold text-white/35">{p.cents}</span>
              )}
            </h2>
          );
        })()}
        {(() => {
          const ms = summarizeMonth(transactions, currentMonthKey);
          if (ms.income === 0 && ms.expense === 0) return null;
          const pos = ms.net >= 0;
          return (
            <div className="flex gap-2 flex-wrap mb-3">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tnum border ${
                pos
                  ? "bg-emerald-400/10 border-emerald-400/25 text-emerald-300"
                  : "bg-rose-400/10 border-rose-400/25 text-rose-300"
              }`}>
                {pos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {pos ? "+" : "−"}{money(Math.abs(ms.net))} este mes
              </span>
              {ms.expense > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tnum bg-white/8 border border-white/15 text-white/60">
                  {money(ms.expense)} gastado
                </span>
              )}
            </div>
          );
        })()}
        {(totalFixedCosts > 0 || totalMsiMonthly > 0) && (
          <p className="text-white/70 text-sm mb-1 tnum">
            Ya descontado: <span className="text-white/50">{money(totalLiabilities)} deudas</span>
            {totalFixedCosts > 0 && <span className="text-white/50"> · {money(totalFixedCosts)} fijos</span>}
            {totalMsiMonthly > 0 && <span className="text-white/50"> · {money(totalMsiMonthly)} de MSI</span>}
            <span className="text-white/40"> — de {money(totalAssets)} en activos</span>
          </p>
        )}
        <p className="text-white/40 text-sm mb-5">Actualizado ahora</p>

        <div className="mb-6">
          <div className="flex justify-between text-xs text-white/50 mb-1.5">
            <span>Disponible real vs Activos totales</span>
            <span className="tnum text-white/70">{balanceProgress.toFixed(1)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isPositive
                  ? "bg-gradient-to-r from-blue-400 to-sky-300"
                  : "bg-gradient-to-r from-rose-400 to-orange-400"
              }`}
              style={{ width: `${balanceProgress}%` }}
            />
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Button
            id="save-snapshot-btn"
            className="bg-white text-black font-bold hover:bg-white/90 shadow-lg shadow-black/30"
            startContent={<Save size={16} />}
            onPress={onSaveSnapshot}
            size="sm"
          >
            Guardar Snapshot
          </Button>
          <Button
            variant="light"
            className="text-white/60 hover:text-white hover:bg-white/10"
            size="sm"
            startContent={<History size={16} />}
            onPress={onViewHistory}
          >
            Ver historial
          </Button>
          <Button
            variant="light"
            className="text-white/60 hover:text-white hover:bg-white/10"
            size="sm"
            startContent={<Database size={16} />}
            onPress={onOpenSettings}
          >
            Ajustes
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
