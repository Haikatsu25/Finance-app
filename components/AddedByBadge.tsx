"use client";

import React from "react";
import { UserRound } from "lucide-react";
import { AddedBy } from "@/types";

/**
 * Etiqueta "por Fulano" en cuentas compartidas.
 * Solo aparece cuando el registro lo agregó ALGUIEN MÁS (no el que lo
 * está viendo) — así cada quien identifica lo del otro sin ruido propio.
 */
export default function AddedByBadge({ addedBy, viewerId, dark = false }: {
  addedBy?: AddedBy;
  viewerId?: string;
  /** true cuando se dibuja sobre fondos oscuros (tarjetas de crédito) */
  dark?: boolean;
}) {
  if (!addedBy?.name || !addedBy.userId || addedBy.userId === viewerId) return null;
  const firstName = addedBy.name.split(" ")[0];
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
        dark
          ? "bg-white/10 text-white/70 border border-white/15"
          : "bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-400"
      }`}
      title={`Agregado por ${addedBy.name}`}
    >
      <UserRound size={8} className="shrink-0" />
      {firstName}
    </span>
  );
}
