"use client";

import { useState } from "react";
import { Trash2, Pencil, Tv } from "lucide-react";
import { SubscriptionItem } from "@/types";
import { moneyExact, moneySmart } from "@/lib/format";
import AddedByBadge from "../AddedByBadge";

// ─────────────────────────────────────────────────────────────────────────────
// GASTOS FIJOS — suscripciones y cobros recurrentes
// ─────────────────────────────────────────────────────────────────────────────
export function SubscriptionsSection({ items, total, onAdd, onRemove, viewerId, onEdit }: {
  items: SubscriptionItem[]; total: number;
  onAdd: (label: string, amount: string, cycle: "mensual" | "anual", category: string) => void;
  onRemove: (id: string) => void;
  viewerId?: string;
  onEdit?: (id: string) => void;
}) {
  const [label, setLabel]   = useState("");
  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState<"mensual" | "anual">("mensual");

  const amountValid = amount !== "" && Number.isFinite(parseFloat(amount)) && parseFloat(amount) > 0;

  const handleAdd = () => {
    if (!label.trim() || !amountValid) return;
    onAdd(label.trim(), amount, billingCycle, "Suscripción");
    setLabel("");
    setAmount("");
  };

  return (
    <section className="pop-card">
      <div className="sec-h">
        <h2 className="sec">Gastos fijos</h2>
        <span className="chip tnum">{moneyExact(total)} al mes</span>
      </div>

      {items.length === 0 ? (
        <div className="empty">Sin gastos fijos. Netflix, renta, gimnasio…</div>
      ) : (
        <div className="list">
          {items.map((item) => (
            <div key={item.id} className="it">
              <i aria-hidden><Tv size={18} /></i>
              <div className="t">
                <b>{item.label}</b>
                <small className="flex items-center gap-x-2 flex-wrap">
                  <span>{item.category ? `${item.category}, ` : ""}{item.billingCycle}</span>
                  <AddedByBadge addedBy={item.addedBy} viewerId={viewerId} />
                </small>
              </div>
              <div className="amt">{moneySmart(item.amount)}</div>
              <div className="acts">
                {onEdit && (
                  <button onClick={() => onEdit(item.id)} aria-label={`Editar ${item.label}`}>
                    <Pencil size={15} aria-hidden />
                  </button>
                )}
                <button onClick={() => onRemove(item.id)} aria-label={`Eliminar ${item.label}`}>
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        <input
          className="field-pill" placeholder="Ej. Netflix, Gimnasio" aria-label="Descripción"
          value={label} onChange={(e) => setLabel(e.target.value)}
        />
        <div className="grid gap-2" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
          <input
            className="field-pill" type="number" min="0" step="0.01" inputMode="decimal"
            placeholder="$ 0.00" aria-label="Monto"
            value={amount} onChange={(e) => setAmount(e.target.value)}
          />
          <select
            className="field-pill" aria-label="Ciclo de cobro"
            value={billingCycle} onChange={(e) => setBillingCycle(e.target.value === "anual" ? "anual" : "mensual")}
          >
            <option value="mensual">Mensual</option>
            <option value="anual">Anual</option>
          </select>
        </div>
        <button type="button" className="btn sm" onClick={handleAdd} disabled={!label.trim() || !amountValid}>
          Agregar fijo
        </button>
      </div>
    </section>
  );
}
