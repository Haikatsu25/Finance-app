"use client";

import React from "react";
import { CloudUpload, Check, AlertTriangle } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// SAVE STATUS — indicador honesto de sincronización
// ─────────────────────────────────────────────────────────────────────────────
export type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const map: Record<Exclude<SaveStatus, "idle">, { icon: React.ReactNode; label: string; cls: string }> = {
    saving:   { icon: <CloudUpload size={13} className="animate-pulse" />, label: "Guardando…", cls: "text-default-500" },
    saved:    { icon: <Check size={13} />, label: "Guardado", cls: "text-money-in-text" },
    error:    { icon: <AlertTriangle size={13} />, label: "Sin conexión", cls: "text-foreground" },
    conflict: { icon: <AlertTriangle size={13} />, label: "Conflicto", cls: "text-money-out-text" },
  };
  const m = map[status];
  return (
    <span className={`hidden sm:flex items-center gap-1.5 text-[11px] font-semibold ${m.cls}`} aria-live="polite">
      {m.icon}
      {m.label}
    </span>
  );
}
