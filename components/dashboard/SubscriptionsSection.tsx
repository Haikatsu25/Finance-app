"use client";

import { useState } from "react";
import { Card, CardHeader, CardBody, Input, Button, Select, SelectItem } from "@heroui/react";
import { Plus, Trash2, Pencil, Calendar } from "lucide-react";
import { SubscriptionItem } from "@/types";
import { moneyExact, moneySmart } from "@/lib/format";
import AddedByBadge from "../AddedByBadge";
import { TONE } from "./tone";

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS SECTION
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

  const t = TONE.indigo;
  const amountValid = amount !== "" && Number.isFinite(parseFloat(amount)) && parseFloat(amount) > 0;

  const handleAdd = () => {
    if (!label.trim() || !amountValid) return;
    onAdd(label.trim(), amount, billingCycle, "Suscripción");
    setLabel("");
    setAmount("");
  };

  return (
    <Card className={`glass card-hover border ${t.border} h-full`}>
      <CardHeader className="flex flex-col items-start px-5 pt-5 pb-0 gap-1">
        <div className={`p-2.5 rounded-xl ${t.iconBg} mb-2`}>
          <div className={t.text}><Calendar size={18} /></div>
        </div>
        <div className="flex justify-between w-full items-start gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight">Gastos Fijos</h3>
            <p className="text-xs text-default-400">Suscripciones y cobros recurrentes</p>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-lg tnum font-extrabold ${t.text}`}>
              {moneyExact(total)}
            </span>
            <p className="text-[10px] text-default-400">/ mes (eqv.)</p>
          </div>
        </div>
      </CardHeader>

      <CardBody className="px-5 py-4 flex flex-col gap-3">
        <div className="flex-grow space-y-2 min-h-[80px]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-6 border-2 border-dashed border-default-200/60 rounded-xl text-default-400 gap-1">
              <p className="text-xs font-medium">Sin gastos fijos</p>
              <p className="text-[11px] text-default-300">Netflix, renta, gimnasio…</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`group flex justify-between items-center p-3 rounded-xl ${t.bgBadge} transition-all duration-200 border border-transparent hover:border-default-200 animate-slide-in-left`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-default-700 truncate">{item.label}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.category && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.bg} ${t.text} font-medium`}>
                        {item.category}
                      </span>
                    )}
                    <span className="text-[10px] text-default-400 font-bold uppercase">{item.billingCycle}</span>
                    <AddedByBadge addedBy={item.addedBy} viewerId={viewerId} />
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className={`tnum font-bold text-sm mr-1 ${t.text}`}>
                    {moneySmart(item.amount)}
                  </span>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item.id)}
                      className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 text-default-300 hover:text-indigo-500 transition-all p-1.5 rounded-lg hover:bg-indigo-500/10"
                      aria-label={`Editar ${item.label}`}
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(item.id)}
                    className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 text-default-300 hover:text-rose-500 transition-all p-1.5 rounded-lg hover:bg-rose-500/10"
                    aria-label={`Eliminar ${item.label}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-default-200/50">
          <Input
            placeholder="Ej. Netflix, Gimnasio"
            size="sm"
            variant="bordered"
            value={label}
            onValueChange={setLabel}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              size="sm"
              variant="bordered"
              startContent={<span className="text-default-400 text-xs font-bold">$</span>}
              className="flex-1"
              value={amount}
              onValueChange={setAmount}
            />
            <Select
              size="sm"
              variant="bordered"
              aria-label="Ciclo de cobro"
              className="w-[120px]"
              selectedKeys={[billingCycle]}
              onSelectionChange={(keys) => {
                const k = Array.from(keys)[0];
                if (k === "mensual" || k === "anual") setBillingCycle(k);
              }}
            >
              <SelectItem key="mensual">Mensual</SelectItem>
              <SelectItem key="anual">Anual</SelectItem>
            </Select>
          </div>
          <Button
            fullWidth
            variant="shadow"
            onPress={handleAdd}
            className="font-bold text-sm bg-indigo-500 text-white"
            size="sm"
            isDisabled={!label.trim() || !amountValid}
            startContent={<Plus size={15} />}
          >
            Agregar Fijo
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
