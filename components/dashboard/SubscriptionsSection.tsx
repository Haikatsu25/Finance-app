"use client";

import { useState } from "react";
import { Tv } from "lucide-react";
import { SubscriptionItem } from "@/types";
import { moneyExact, moneySmart } from "@/lib/format";
import AddedByBadge from "../AddedByBadge";
import { Picker } from "../ui/Picker";
import { RowActions } from "../ui/RowActions";

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
              <div className="mid">
                <div className="t">
                  <b>{item.label}</b>
                  <small>{item.category ? `${item.category}, ` : ""}{item.billingCycle}</small>
                </div>
                <div className="amt">{moneySmart(item.amount)}</div>
              </div>
              <RowActions name={item.label} onEdit={onEdit && (() => onEdit(item.id))} onRemove={() => onRemove(item.id)} />
            </div>
          ))}
        </div>
      )}

      <div className="add-form">
        <input
          className="field-pill af-desc" placeholder="Ej. Netflix, Gimnasio" aria-label="Descripción"
          value={label} onChange={(e) => setLabel(e.target.value)}
        />
        <Picker
          className="af-cat" label="Ciclo de cobro" value={billingCycle}
          onChange={(v) => setBillingCycle(v === "anual" ? "anual" : "mensual")}
          options={[{ value: "mensual", label: "Mensual" }, { value: "anual", label: "Anual" }]}
        />
        <input
          className="field-pill af-amt" type="number" min="0" step="0.01" inputMode="decimal"
          placeholder="$ 0.00" aria-label="Monto"
          value={amount} onChange={(e) => setAmount(e.target.value)}
        />
        <button type="button" className="btn sm af-btn" onClick={handleAdd} disabled={!label.trim() || !amountValid}>
          Agregar fijo
        </button>
      </div>
    </section>
  );
}
