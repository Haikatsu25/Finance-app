"use client";

import React from "react";
import { House, AlignLeft, ChartColumn, Sparkles, Clock } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

// ─────────────────────────────────────────────────────────────────────────────
// NAVEGACIÓN — móvil: barra flotante de cristal; escritorio (≥900px): riel izquierdo de 232px
// ─────────────────────────────────────────────────────────────────────────────
export type NavTab = "dashboard" | "transactions" | "analytics" | "ai" | "history";

export const NAV_ORDER: NavTab[] = ["dashboard", "transactions", "analytics", "ai", "history"];

export function AppNav({ active, onChange }: { active: NavTab; onChange: (t: NavTab) => void }) {
  const tabs: { id: NavTab; icon: React.ReactNode; label: string }[] = [
    { id: "dashboard",    icon: <House size={22} aria-hidden />,       label: "Inicio" },
    { id: "transactions", icon: <AlignLeft size={22} aria-hidden />,   label: "Movs" },
    { id: "analytics",    icon: <ChartColumn size={22} aria-hidden />, label: "Análisis" },
    { id: "ai",           icon: <Sparkles size={22} aria-hidden />,    label: "IA" },
    { id: "history",      icon: <Clock size={22} aria-hidden />,       label: "Historial" },
  ];

  return (
    <nav className="app-nav" aria-label="Navegación principal">
      <span className="app-nav-brand"><Logo size={30} /> Finance Control</span>
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          aria-current={active === t.id ? "page" : undefined}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </nav>
  );
}
