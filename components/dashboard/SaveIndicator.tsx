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
    saving:   { icon: <CloudUpload size={13} className="animate-pulse" />, label: "Guardando…", cls: "text-default-400" },
    saved:    { icon: <Check size={13} />, label: "Guardado", cls: "text-emerald-500" },
    error:    { icon: <AlertTriangle size={13} />, label: "Sin conexión", cls: "text-amber-500" },
    conflict: { icon: <AlertTriangle size={13} />, label: "Conflicto", cls: "text-rose-500" },
  };
  const m = map[status];
  return (
    <span className={`hidden sm:flex items-center gap-1.5 text-[11px] font-semibold ${m.cls}`} aria-live="polite">
      {m.icon}
      {m.label}
    </span>
  );
}
