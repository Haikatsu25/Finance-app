"use client";

import { UserRound } from "lucide-react";
import { AddedBy } from "@/types";

/**
 * Etiqueta "por Fulano" en cuentas compartidas.
 * Solo aparece cuando el registro lo agregó ALGUIEN MÁS (no el que lo
 * está viendo), así cada quien identifica lo del otro sin ruido propio.
 * Es una etiqueta de persona, no de dinero: va en neutro (no en un color de marca).
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
      className={`inline-flex items-center gap-1 text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border ${
        dark
          ? "bg-white/10 text-(--face-fg) border-(--face-line)"
          : "bg-default-100 text-default-800 border-default-300"
      }`}
      title={`Agregado por ${addedBy.name}`}
    >
      <UserRound size={11} className="shrink-0" aria-hidden />
      {firstName}
    </span>
  );
}
