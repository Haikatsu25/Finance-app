"use client";

import React, { useState } from "react";
import { Trash2, Pencil, CreditCard, ShoppingBag } from "lucide-react";
import { FinanceItem, CreditCardItem } from "@/types";
import { moneyExact, moneySmart, round2 } from "@/lib/format";
import AddedByBadge from "../AddedByBadge";

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
        <b className={`figure text-[18px] shrink-0 ${totalCls}`}>{moneyExact(total)}</b>
      </div>

      {items.length === 0 ? (
        <div className="empty">Sin registros aún. Agrega el primero aquí abajo.</div>
      ) : (
        <div className="list">
          {items.map((item) => (
            <div key={item.id} className="it">
              <i aria-hidden>{item.cardId ? <CreditCard size={18} /> : <ShoppingBag size={18} />}</i>
              <div className="t">
                <b>{item.label}</b>
                <small className="flex items-center gap-x-2 flex-wrap">
                  {item.cardId && cardName(item.cardId) && <span className="font-semibold">{cardName(item.cardId)}</span>}
                  {item.category && <span>{item.category}</span>}
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
        <div className="grid gap-2" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
          <input
            className="field-pill" placeholder="Descripción" aria-label="Descripción"
            value={label} onChange={(e) => setLabel(e.target.value)}
          />
          <select
            className="field-pill" aria-label="Categoría"
            value={category} onChange={(e) => setCategory(e.target.value || categories[0])}
          >
            {categories.map((cat) => <option key={cat}>{cat}</option>)}
          </select>
        </div>

        {/* Selector de tarjeta: el gasto se suma a la deuda de esa tarjeta */}
        {hasCards && (
          <select className="field-pill" aria-label="¿Con qué pagaste?" value={payWith} onChange={(e) => setPayWith(e.target.value || "cash")}>
            <option value="cash">Efectivo / débito</option>
            {cards!.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        )}

        <div className="grid gap-2" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
          <input
            className="field-pill" type="number" min="0" step="0.01" inputMode="decimal"
            placeholder="$ 0.00" aria-label="Monto"
            value={amount} onChange={(e) => setAmount(e.target.value)}
          />
          <button
            type="button" className="btn sm"
            onClick={handleAdd}
            disabled={!label.trim() || !amountValid || msiTooBig}
          >
            {selectedCard ? `Cargar a ${selectedCard.label}` : "Agregar"}
          </button>
        </div>

        {/* El total del banco suele incluir las mensualidades MSI ya facturadas */}
        {selectedCard && cardMsi > 0 && (
          <label className="callout flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox" checked={includeMsi}
              onChange={(e) => setIncludeMsi(e.target.checked)}
              className="mt-0.5 size-4 accent-(--brand)"
            />
            <span className="text-[12px] leading-snug">
              El monto ya incluye mis mensualidades de meses
              (<b className="tnum">{moneyExact(cardMsi)}</b>); restarlas
            </span>
          </label>
        )}

        {amountValid && msiApplies && !msiTooBig && (
          <p className="text-[12px] font-bold text-money-in-text tnum">
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
          <p className="mute text-[12px] leading-snug">
            Se sumará a la deuda de <b>{selectedCard.label}</b>. Cuando lo pagues, elimínalo de esta lista
            (o usa el botón Pagado de la tarjeta) y se descontará.
          </p>
        )}
      </div>
    </section>
  );
}
