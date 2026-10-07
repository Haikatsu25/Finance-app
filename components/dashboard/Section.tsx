"use client";

import React, { useState } from "react";
import { CreditCard, ShoppingBag } from "lucide-react";
import { FinanceItem, CreditCardItem } from "@/types";
import { moneyExact, moneySmart, round2 } from "@/lib/format";
import AddedByBadge from "../AddedByBadge";
import { Picker } from "../ui/Picker";
import { RowActions } from "../ui/RowActions";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION — captura de activos / gastos / apartados
// ─────────────────────────────────────────────────────────────────────────────
export function Section({ title, description, icon, items, total, color, categories, onAdd, onRemove, cards, msiMonthly, viewerId, onEdit }: {
  title: string; description: string; icon?: React.ReactNode;
  items: FinanceItem[]; total: number;
  color: "success" | "danger" | "warning"; categories: string[];
  onAdd: (label: string, amount: string, date: string, category: string, cardId?: string) => void;
  onRemove: (id: string) => void;
  /** Solo para la sección de gastos: permite cargar el gasto a una tarjeta */
  cards?: CreditCardItem[];
  /** Mensualidad de MSI activa por tarjeta (cardId → $/mes) */
  msiMonthly?: Record<string, number>;
  viewerId?: string;
  onEdit?: (id: string) => void;
}) {
  const [label, setLabel]       = useState("");
  const [amount, setAmount]     = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [payWith, setPayWith]   = useState("cash"); // "cash" | id de tarjeta
  const [includeMsi, setIncludeMsi] = useState(true);

  const tone = color === "success" ? "in" : color === "danger" ? "out" : "hold";
  const parsed = parseFloat(amount);
  const amountValid = amount !== "" && Number.isFinite(parsed) && parsed > 0;

  const hasCards = !!cards?.length;
  const selectedCard = hasCards && payWith !== "cash" ? cards!.find((c) => c.id === payWith) : undefined;
  const cardName = (id?: string) => cards?.find((c) => c.id === id)?.label;

  // Descuento de mensualidades MSI: si el monto que copias del banco ya
  // incluye las mensualidades de este mes, se restan para obtener el contado real
  const cardMsi = selectedCard ? (msiMonthly?.[selectedCard.id] || 0) : 0;
  const msiApplies = cardMsi > 0 && includeMsi;
  const effectiveAmount = amountValid
    ? round2(msiApplies ? parsed - cardMsi : parsed)
    : 0;
  const msiTooBig = amountValid && msiApplies && effectiveAmount <= 0;

  const handleAdd = () => {
    if (!label.trim() || !amountValid || msiTooBig) return;
    onAdd(label.trim(), String(effectiveAmount), "", category, selectedCard?.id);
    setLabel("");
    setAmount("");
    setCategory(categories[0]);
  };

  const totalCls = tone === "in" ? "text-money-in-text" : tone === "out" ? "text-money-out-text" : "text-money-hold-text";

  return (
    <section className="pop-card">
      <div className="sec-h" style={{ alignItems: "flex-start" }}>
        <div className="min-w-0">
          <h2 className="sec">{title}</h2>
          <p className="mute text-xs font-semibold mt-0.5">{description}</p>
        </div>
        <b className={`figure text-[1.125rem] shrink-0 ${totalCls}`}>{moneyExact(total)}</b>
      </div>

      {items.length === 0 ? (
        <div className="empty">Sin registros aún. Agrega el primero aquí abajo.</div>
      ) : (
        <div className="list">
          {items.map((item) => (
            <div key={item.id} className="it">
              <i aria-hidden>{item.cardId ? <CreditCard size={18} /> : <ShoppingBag size={18} />}</i>
              <div className="mid">
                <div className="t">
                  <b>{item.label}</b>
                  <small>{item.category || (item.cardId && cardName(item.cardId)) || ""}</small>
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
          className="field-pill af-desc" placeholder="Descripción" aria-label="Descripción"
          value={label} onChange={(e) => setLabel(e.target.value)}
        />
        <Picker
          className="af-cat" label="Categoría" value={category} onChange={(v) => setCategory(v || categories[0])}
          options={categories.map((cat) => ({ value: cat, label: cat }))}
        />

        {/* Selector de tarjeta: el gasto se suma a la deuda de esa tarjeta */}
        {hasCards && (
          <Picker
            className="af-pay" label="¿Con qué pagaste?" value={payWith} onChange={(v) => setPayWith(v || "cash")}
            options={[{ value: "cash", label: "Efectivo / débito" }, ...cards!.map((c) => ({ value: c.id, label: c.label }))]}
          />
        )}

        <input
          className="field-pill af-amt" type="number" min="0" step="0.01" inputMode="decimal"
          placeholder="$ 0.00" aria-label="Monto"
          value={amount} onChange={(e) => setAmount(e.target.value)}
        />
        <button
          type="button" className="btn sm af-btn"
          onClick={handleAdd}
          disabled={!label.trim() || !amountValid || msiTooBig}
        >
          {selectedCard ? `Cargar a ${selectedCard.label}` : "Agregar"}
        </button>
      </div>

      <div className="mt-2 flex flex-col gap-2">

        {/* El total del banco suele incluir las mensualidades MSI ya facturadas */}
        {selectedCard && cardMsi > 0 && (
          <label className="callout flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox" checked={includeMsi}
              onChange={(e) => setIncludeMsi(e.target.checked)}
              className="chk"
            />
            <span className="text-[0.75rem] leading-snug">
              El monto ya incluye mis mensualidades de meses
              (<b className="tnum">{moneyExact(cardMsi)}</b>); restarlas
            </span>
          </label>
        )}

        {amountValid && msiApplies && !msiTooBig && (
          <p className="text-[0.75rem] font-bold text-money-in-text tnum">
            Se registrarán {moneyExact(effectiveAmount)} de contado
            <span className="font-normal mute"> ({moneyExact(parsed)} − {moneyExact(cardMsi)} de MSI)</span>
          </p>
        )}

        {msiTooBig && (
          <p className="err-msg">
            El monto es menor o igual a tus mensualidades: no quedaría nada de contado. Desmarca la casilla si el monto no incluye MSI.
          </p>
        )}

        {selectedCard && (
          <p className="mute text-[0.75rem] leading-snug">
            Se sumará a la deuda de <b>{selectedCard.label}</b>. Cuando lo pagues, elimínalo de esta lista
            (o usa el botón Pagado de la tarjeta) y se descontará.
          </p>
        )}
      </div>
    </section>
  );
}
