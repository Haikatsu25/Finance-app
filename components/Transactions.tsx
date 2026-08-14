"use client";

import React, { useMemo, useState } from "react";
import { Card, CardBody, Input, Button, Select, SelectItem } from "@heroui/react";
import {
  ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight,
  Plus, Trash2, ReceiptText,
} from "lucide-react";
import { TransactionItem } from "@/types";
import { money, moneyExact, round2 } from "@/lib/format";
import { monthKey, shiftMonth, monthLabel, summarizeMonth } from "@/lib/finance-utils";
import MonthlySummary from "./MonthlySummary";
import AddedByBadge from "./AddedByBadge";

export const EXPENSE_CATEGORIES = [
  "Comida", "Súper", "Transporte", "Hogar", "Servicios", "Salud",
  "Entretenimiento", "Ropa", "Educación", "Suscripción", "Otros",
];
export const INCOME_CATEGORIES = ["Nómina", "Freelance", "Venta", "Regalo", "Otros"];

export default function Transactions({ transactions, onAdd, onRemove, viewerId }: {
  transactions: TransactionItem[];
  onAdd: (t: Omit<TransactionItem, "id">) => void;
  onRemove: (id: string) => void;
  viewerId?: string;
}) {
  const [month, setMonth] = useState<string>(monthKey(new Date()));
  const [type, setType] = useState<"expense" | "income">("expense");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);

  const cats = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const amountValid = amount !== "" && Number.isFinite(parseFloat(amount)) && parseFloat(amount) > 0;
  const currentMonth = monthKey(new Date());

  const summary = useMemo(() => summarizeMonth(transactions, month), [transactions, month]);
  const prevSummary = useMemo(() => summarizeMonth(transactions, shiftMonth(month, -1)), [transactions, month]);

  // Agrupar por día, descendente
  const grouped = useMemo(() => {
    const inMonth = transactions
      .filter((t) => monthKey(t.date) === month)
      .sort((a, b) => b.date.localeCompare(a.date));
    const map = new Map<string, TransactionItem[]>();
    for (const t of inMonth) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    return Array.from(map.entries());
  }, [transactions, month]);

  const submit = () => {
    if (!label.trim() || !amountValid) return;
    onAdd({
      label: label.trim(),
      amount: round2(parseFloat(amount)),
      date: date || new Date().toISOString().split("T")[0],
      type,
      category,
      source: "manual",
    });
    setLabel(""); setAmount(""); setDate("");
  };

  return (
    <div className="space-y-4" id="transactions-section">
      {/* Header + navegación de mes */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <ReceiptText className="text-emerald-500 w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold section-title">Movimientos</h3>
            <p className="text-xs text-default-400 mt-0.5">Cada peso que entra y sale</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-default-100/70 rounded-xl p-1">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="p-1.5 rounded-lg hover:bg-default-200 text-default-500" aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-bold px-2 capitalize min-w-[120px] text-center">{monthLabel(month)}</span>
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            disabled={month >= currentMonth}
            className="p-1.5 rounded-lg hover:bg-default-200 text-default-500 disabled:opacity-30"
            aria-label="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Resumen del mes (wrapped) */}
      <MonthlySummary summary={summary} prevSummary={prevSummary} />

      {/* Captura */}
      <Card className="glass border-0">
        <CardBody className="p-4">
          <div className="flex flex-col lg:flex-row gap-2">
            <div className="flex gap-1.5">
              <button
                onClick={() => { setType("expense"); setCategory(EXPENSE_CATEGORIES[0]); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  type === "expense" ? "bg-rose-500 text-white shadow-md" : "bg-default-100 text-default-500"
                }`}
              >
                <ArrowDownCircle size={14} /> Gasto
              </button>
              <button
                onClick={() => { setType("income"); setCategory(INCOME_CATEGORIES[0]); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  type === "income" ? "bg-emerald-500 text-white shadow-md" : "bg-default-100 text-default-500"
                }`}
              >
                <ArrowUpCircle size={14} /> Ingreso
              </button>
            </div>
            <Input placeholder="¿En qué?" size="sm" variant="bordered" className="flex-1" value={label} onValueChange={setLabel} />
            <div className="flex gap-2">
              <Input
                type="number" min="0" inputMode="decimal" placeholder="0.00" size="sm" variant="bordered"
                startContent={<span className="text-default-400 text-xs font-bold">$</span>}
                className="w-28" value={amount} onValueChange={setAmount}
              />
              <Select size="sm" variant="bordered" aria-label="Categoría" className="w-36"
                selectedKeys={[category]} onChange={(e) => setCategory(e.target.value || cats[0])}>
                {cats.map((c) => <SelectItem key={c}>{c}</SelectItem>)}
              </Select>
              <Input type="date" size="sm" variant="bordered" aria-label="Fecha" className="w-[130px]" value={date} onValueChange={setDate} />
            </div>
            <Button size="sm" color={type === "expense" ? "danger" : "success"} variant="shadow"
              className="font-bold" isDisabled={!label.trim() || !amountValid}
              startContent={<Plus size={14} />} onPress={submit}>
              Registrar
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Lista agrupada por día */}
      <Card className="glass border-0">
        <CardBody className="p-0">
          {grouped.length === 0 ? (
            <div className="py-14 text-center text-default-400">
              <ReceiptText size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin movimientos en {monthLabel(month)}</p>
              <p className="text-xs mt-1">Registra tu primer gasto o ingreso arriba</p>
            </div>
          ) : (
            <div className="divide-y divide-default-100/60">
              {grouped.map(([day, items]) => {
                const dayTotal = items.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
                return (
                  <div key={day} className="px-4 py-3">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-default-400">
                        {new Date(day + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" })}
                      </p>
                      <span className={`text-[11px] font-bold tnum ${dayTotal >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {dayTotal >= 0 ? "+" : "−"}{money(Math.abs(dayTotal))}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {items.map((t) => (
                        <div key={t.id} className="group flex items-center gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-default-100/50 transition-colors">
                          <div className={`p-1.5 rounded-lg shrink-0 ${t.type === "income" ? "bg-emerald-500/12 text-emerald-500" : "bg-rose-500/12 text-rose-500"}`}>
                            {t.type === "income" ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-default-700 truncate">{t.label}</p>
                            <p className="text-[10px] text-default-400 flex items-center gap-1.5 flex-wrap">
                              {t.category || "Sin categoría"}{t.source === "scan" && " · 📷 escaneado"}
                              <AddedByBadge addedBy={t.addedBy} viewerId={viewerId} />
                            </p>
                          </div>
                          <span className={`tnum font-bold text-sm shrink-0 ${t.type === "income" ? "text-emerald-500" : "text-default-700"}`}>
                            {t.type === "income" ? "+" : "−"}{moneyExact(t.amount)}
                          </span>
                          <button
                            onClick={() => onRemove(t.id)}
                            className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 text-default-300 hover:text-rose-500 transition-all p-1 shrink-0"
                            aria-label={`Eliminar ${t.label}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
