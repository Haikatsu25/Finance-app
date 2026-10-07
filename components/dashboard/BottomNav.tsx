"use client";

import React from "react";
import { LayoutDashboard, ReceiptText, BarChart2, Brain, History } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE BOTTOM NAV
// ─────────────────────────────────────────────────────────────────────────────
export type NavTab = "dashboard" | "transactions" | "analytics" | "ai" | "history";

export function BottomNav({ active, onChange }: { active: NavTab; onChange: (t: NavTab) => void }) {
  const tabs: { id: NavTab; icon: React.ReactNode; label: string }[] = [
    { id: "dashboard",    icon: <LayoutDashboard size={20} />, label: "Inicio" },
    { id: "transactions", icon: <ReceiptText size={20} />,     label: "Movs" },
    { id: "analytics",    icon: <BarChart2 size={20} />,       label: "Análisis" },
    { id: "ai",           icon: <Brain size={20} />,            label: "IA" },
    { id: "history",      icon: <History size={20} />,          label: "Historial" },
  ];

  return (
    <nav className="bottom-nav md:hidden" aria-label="Navegación principal">
      <div className="flex justify-around py-2">
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 min-w-[56px] rounded-xl transition-all duration-200 ${
                isActive ? "text-foreground" : "text-default-500 hover:text-foreground"
              }`}
              aria-label={t.label}
              aria-current={isActive ? "page" : undefined}
            >
              {t.icon}
              <span className={`text-[11px] ${isActive ? "font-bold" : "font-semibold"}`}>{t.label}</span>
              {isActive && <span className="absolute -top-2 w-8 h-[3px] rounded-b-sm bg-foreground" aria-hidden />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
