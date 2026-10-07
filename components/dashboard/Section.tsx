"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardBody, Input, Button, Divider, Select, SelectItem } from "@heroui/react";
import { Plus, Trash2, Pencil, CreditCard } from "lucide-react";
import { FinanceItem, CreditCardItem } from "@/types";
import { moneyExact, moneySmart, round2 } from "@/lib/format";
import AddedByBadge from "../AddedByBadge";
import { TONE, SECTION_TONE } from "./tone";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION — captura de activos / gastos / apartados
// ─────────────────────────────────────────────────────────────────────────────
export function Section({ title, description, icon, items, total, color, categories, onAdd, onRemove, cards, msiMonthly, viewerId, onEdit }: {
  title: string; description: string; icon: React.ReactNode;
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
  const [date, setDate]         = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [payWith, setPayWith]   = useState("cash"); // "cash" | id de tarjeta
  const [includeMsi, setIncludeMsi] = useState(true);

  const t = TONE[SECTION_TONE[color]];
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
    onAdd(label.trim(), String(effectiveAmount), date, category, selectedCard?.id);
    setLabel("");
    setAmount("");
    setDate("");
    setCategory(categories[0]);
  };

  return (
    <Card className={`glass card-hover ${t.rule} h-full shadow-none`}>
      <CardHeader className="flex items-start justify-between w-full px-5 pt-4 pb-0 gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
            <span className={`${t.text} shrink-0`} aria-hidden>{icon}</span>
            {title}
          </h3>
          <p className="text-xs text-default-500 mt-0.5">{description}</p>
        </div>
        <span className={`figure text-[1.65rem] shrink-0 ${t.text}`}>
          {moneyExact(total)}
        </span>
      </CardHeader>

      <CardBody className="px-5 py-4 flex flex-col gap-3">
        <div className="flex-grow min-h-[80px]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-6 border-2 border-dashed border-default-300 rounded-lg text-default-500 gap-1">
              <p className="text-xs font-semibold">Sin registros aún</p>
              <p className="text-[11px]">Agrega el primero en el formulario de abajo</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="group flex justify-between items-center gap-2 py-2.5 border-b border-default-200 last:border-b-0"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold truncate">{item.label}</span>
                  <div className="flex items-center gap-x-2 gap-y-0.5 mt-0.5 flex-wrap">
                    {item.cardId && cardName(item.cardId) && (
                      <span className="text-[11px] text-default-500 font-semibold flex items-center gap-1">
                        <CreditCard size={11} aria-hidden />
                        {cardName(item.cardId)}
                      </span>
                    )}
                    {item.category && (
                      <span className="text-[11px] text-default-500">
                        {item.category}
                      </span>
                    )}
                    <AddedByBadge addedBy={item.addedBy} viewerId={viewerId} />
                    {item.date && <span className="text-[11px] text-default-500 tnum">{item.date}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className={`figure text-[1.35rem] text-right mr-1 ${t.text}`}>
                    {moneySmart(item.amount)}
                  </span>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item.id)}
                      className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 text-default-500 hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-foreground/10"
                      aria-label={`Editar ${item.label}`}
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(item.id)}
                    className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 text-default-500 hover:text-money-out-text transition-colors p-1.5 rounded-md hover:bg-money-out/10"
                    aria-label={`Eliminar ${item.label}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Divider className="my-1" />

        <div className="space-y-2.5">
          <Input
            placeholder="Descripción"
            size="sm"
            variant="bordered"
            classNames={{ inputWrapper: "bg-default-50 hover:bg-default-100 border-default-200" }}
            value={label}
            onValueChange={setLabel}
          />

          {/* Selector de tarjeta: el gasto se suma a la deuda de esa tarjeta */}
          {hasCards && (
            <Select
              size="sm"
              variant="bordered"
              aria-label="¿Con qué pagaste?"
              startContent={<CreditCard size={14} className="text-default-400 shrink-0" />}
              classNames={{ trigger: "bg-default-50 hover:bg-default-100 border-default-200" }}
              selectedKeys={[payWith]}
              onChange={(e) => setPayWith(e.target.value || "cash")}
            >
              <>
                <SelectItem key="cash" textValue="Efectivo / débito">Efectivo / débito</SelectItem>
                <>{cards!.map((c) => (
                  <SelectItem key={c.id} textValue={c.label}>{c.label}</SelectItem>
                ))}</>
              </>
            </Select>
          )}

          <Select
            placeholder="Categoría"
            size="sm"
            variant="bordered"
            aria-label="Categoría"
            classNames={{ trigger: "bg-default-50 hover:bg-default-100 border-default-200" }}
            selectedKeys={[category]}
            onChange={(e) => setCategory(e.target.value || categories[0])}
          >
            {categories.map((cat) => (
              <SelectItem key={cat}>{cat}</SelectItem>
            ))}
          </Select>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              size="sm"
              variant="bordered"
              classNames={{ inputWrapper: "bg-default-50 hover:bg-default-100 border-default-200" }}
              startContent={<span className="text-default-400 text-xs font-bold">$</span>}
              className="flex-1"
              value={amount}
              onValueChange={setAmount}
            />
            <Input
              type="date"
              size="sm"
              variant="bordered"
              aria-label="Fecha"
              classNames={{ inputWrapper: "bg-default-50 hover:bg-default-100 border-default-200" }}
              className="w-[130px]"
              value={date}
              onValueChange={setDate}
            />
          </div>
          {/* El total del banco suele incluir las mensualidades MSI ya facturadas */}
          {selectedCard && cardMsi > 0 && (
            <label className="flex items-start gap-2 p-2.5 rounded-lg bg-ink/5 border border-ink/20 cursor-pointer">
              <input
                type="checkbox"
                checked={includeMsi}
                onChange={(e) => setIncludeMsi(e.target.checked)}
                className="mt-0.5 accent-[var(--ink)]"
              />
              <span className="text-[11px] text-default-600 leading-snug">
                El monto ya incluye mis mensualidades de meses
                (<span className="font-bold tnum">{moneyExact(cardMsi)}</span>) — restarlas
              </span>
            </label>
          )}

          {amountValid && msiApplies && !msiTooBig && (
            <p className="text-[11px] font-bold text-money-in-text tnum">
              Se registrarán {moneyExact(effectiveAmount)} de contado
              <span className="font-normal text-default-400"> ({moneyExact(parsed)} − {moneyExact(cardMsi)} de MSI)</span>
            </p>
          )}

          {msiTooBig && (
            <p className="text-[11px] font-bold text-money-out-text">
              El monto es menor o igual a tus mensualidades — no quedaría nada de contado. Desmarca la casilla si el monto no incluye MSI.
            </p>
          )}

          <Button
            fullWidth
            color={color}
            variant="solid"
            onPress={handleAdd}
            className="font-bold text-sm"
            size="sm"
            isDisabled={!label.trim() || !amountValid || msiTooBig}
            startContent={<Plus size={15} />}
          >
            {selectedCard ? `Cargar a ${selectedCard.label}` : "Agregar"}
          </Button>

          {selectedCard && (
            <p className="text-[11px] text-default-500 leading-snug">
              Se sumará a la deuda de <span className="font-bold">{selectedCard.label}</span>. Cuando lo pagues,
              elimínalo de esta lista (o usa el botón Pagado de la tarjeta) y se descontará.
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
