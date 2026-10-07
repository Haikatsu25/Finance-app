"use client";

import React from "react";
import { CloudUpload, Check, AlertTriangle } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SAVE STATUS — indicador honesto de sincronización
// ─────────────────────────────────────────────────────────────────────────────
export type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const map: Record<Exclude<SaveStatus, "idle">, { icon: React.ReactNode; label: string; cls: string; loud?: boolean }> = {
    saving:   { icon: <CloudUpload size={13} className="animate-pulse" />, label: "Guardando…", cls: "text-default-500" },
    saved:    { icon: <Check size={13} />, label: "Guardado", cls: "text-money-in-text" },
    error:    { icon: <AlertTriangle size={14} />, label: "Sin conexión", cls: "text-foreground", loud: true },
    conflict: { icon: <AlertTriangle size={14} />, label: "Conflicto", cls: "text-money-out-text", loud: true },
  };
  const m = map[status];
  return (
    <span
      className={`items-center gap-1.5 whitespace-nowrap ${m.cls} ${
        // Un fallo de guardado se ve siempre (también en móvil) y con peso propio: contorno de 2px + texto en negrita
        m.loud
          ? "flex text-xs font-bold border-2 border-current rounded-md px-2 py-0.5"
          : "hidden sm:flex text-[11px] font-semibold"
      }`}
      role={m.loud ? "alert" : undefined}
      aria-live="polite"
    >
      {m.icon}
      {m.label}
    </span>
  );
}
