"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardBody, Input, Button, Select, SelectItem } from "@heroui/react";
import { PiggyBank, Plus, Trash2, AlertTriangle } from "lucide-react";
import { BudgetItem, TransactionItem } from "@/types";
import { money, round2 } from "@/lib/format";
import { monthKey, spentByCategory } from "@/lib/finance-utils";
import { EXPENSE_CATEGORIES } from "./Transactions";
import AddedByBadge from "./AddedByBadge";

export default function Budgets({ budgets, transactions, onAdd, onRemove, viewerId }: {
  budgets: BudgetItem[];
  transactions: TransactionItem[];
  onAdd: (b: Omit<BudgetItem, "id">) => void;
  onRemove: (id: string) => void;
  viewerId?: string;
}) {
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [limit, setLimit] = useState("");

  const spent = useMemo(
    () => spentByCategory(transactions, monthKey(new Date())),
    [transactions],
  );

  const available = EXPENSE_CATEGORIES.filter((c) => !budgets.some((b) => b.category === c));
  const limitValid = limit !== "" && Number.isFinite(parseFloat(limit)) && parseFloat(limit) > 0;

  const submit = () => {
    if (!limitValid || !category) return;
    onAdd({ category, monthlyLimit: round2(parseFloat(limit)) });
    setLimit("");
    const next = available.filter((c) => c !== category);
    if (next.length) setCategory(next[0]);
  };

  return (
    <Card className="glass card-hover border border-blue-500/20 col-span-1 sm:col-span-2 lg:col-span-3">
      <CardHeader className="flex flex-col items-start px-5 pt-5 pb-0 gap-1">
        <div className="p-2.5 rounded-xl bg-blue-500/12 mb-2">
          <PiggyBank size={18} className="text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="text-base font-bold tracking-tight">Presupuestos del Mes</h3>
        <p className="text-xs text-default-400">Límite por categoría, calculado con tus movimientos</p>
      </CardHeader>

      <CardBody className="px-5 py-4 flex flex-col gap-4">
        {budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-default-200/60 rounded-xl text-default-400 gap-1">
            <p className="text-xs font-medium">Sin presupuestos</p>
            <p className="text-[11px] text-default-300">Ej. Comida $3,000/mes — te avisamos al 80%</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {budgets.map((b) => {
              const used = spent.get(b.category) || 0;
              const pct = b.monthlyLimit > 0 ? (used / b.monthlyLimit) * 100 : 0;
              const over = pct >= 100;
              const warn = pct >= 80 && !over;
              const barCls = over ? "bg-rose-500" : warn ? "bg-amber-500" : "bg-blue-500";
              return (
                <div key={b.id} className={`group p-3.5 rounded-xl border transition-colors ${
                  over ? "bg-rose-500/8 border-rose-500/25" : warn ? "bg-amber-500/8 border-amber-500/25" : "bg-blue-500/5 border-blue-500/15"
                }`}>
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-sm font-bold text-default-800 flex items-center gap-1.5 flex-wrap">
                      {b.category}
                      {(over || warn) && <AlertTriangle size={12} className={over ? "text-rose-500" : "text-amber-500"} />}
                      <AddedByBadge addedBy={b.addedBy} viewerId={viewerId} />
                    </span>
                    <button
                      onClick={() => onRemove(b.id)}
                      className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 text-default-300 hover:text-rose-500 transition-all p-0.5"
                      aria-label={`Eliminar presupuesto de ${b.category}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex justify-between text-xs tnum mb-1.5">
                    <span className={`font-bold ${over ? "text-rose-500" : warn ? "text-amber-600 dark:text-amber-400" : "text-default-600"}`}>
                      {money(used)}
                    </span>
                    <span className="text-default-400">de {money(b.monthlyLimit)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-default-200/60 overflow-hidden" role="progressbar"
                    aria-valuenow={Math.min(100, Math.round(pct))} aria-valuemin={0} aria-valuemax={100}>
                    <div className={`h-full rounded-full transition-all duration-500 ${barCls}`}
                      style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <p className="text-[10px] text-default-400 mt-1.5">
                    {over
                      ? <span className="text-rose-500 font-bold">Excedido por {money(used - b.monthlyLimit)}</span>
                      : `Te quedan ${money(b.monthlyLimit - used)} este mes`}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-default-200/50">
          <Select size="sm" variant="bordered" aria-label="Categoría" className="flex-1"
            selectedKeys={category ? [category] : []} onChange={(e) => setCategory(e.target.value)}>
            {(available.length ? available : EXPENSE_CATEGORIES).map((c) => <SelectItem key={c}>{c}</SelectItem>)}
          </Select>
          <Input type="number" min="0" inputMode="decimal" placeholder="Límite mensual $" size="sm" variant="bordered"
            className="w-full sm:w-44" value={limit} onValueChange={setLimit} />
          <Button size="sm" variant="shadow" className="font-bold bg-blue-500 text-white"
            isDisabled={!limitValid} startContent={<Plus size={14} />} onPress={submit}>
            Crear presupuesto
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
