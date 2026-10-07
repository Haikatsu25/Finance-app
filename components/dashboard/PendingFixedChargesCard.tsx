"use client";

import { Repeat } from "lucide-react";
import { SubscriptionItem } from "@/types";
import { money } from "@/lib/format";
import { monthLabel } from "@/lib/finance-utils";

export function PendingFixedChargesCard({ pendingFixed, pendingFixedTotal, currentMonthKey, onDismiss, onRegister }: {
  pendingFixed: SubscriptionItem[];
  pendingFixedTotal: number;
  currentMonthKey: string;
  onDismiss: () => void;
  onRegister: () => void;
}) {
  return (
    <section className="pop-card flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <i className="grid place-items-center size-10 rounded-full bg-brand-soft text-brand-text shrink-0" aria-hidden>
          <Repeat size={18} />
        </i>
        <div className="min-w-0">
          <h2 className="text-sm font-bold">
            ¿Registro tus gastos fijos de <span className="capitalize">{monthLabel(currentMonthKey).split(" ")[0]}</span>?
          </h2>
          <p className="text-xs mute truncate">
            {pendingFixed.map((s) => s.label).join(", ")}. Total <b className="tnum text-foreground">{money(pendingFixedTotal)}</b>
          </p>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" className="btn soft sm" onClick={onDismiss}>Este mes no</button>
        <button type="button" className="btn sm" onClick={onRegister}>Registrar {pendingFixed.length}</button>
      </div>
    </section>
  );
}
