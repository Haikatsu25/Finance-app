"use client";

import { useMemo, useState } from "react";
import { Trash2, Pencil, Check } from "lucide-react";
import { BudgetItem, TransactionItem } from "@/types";
import { money, round2 } from "@/lib/format";
import { monthKey, spentByCategory } from "@/lib/finance-utils";
import { EXPENSE_CATEGORIES } from "./Transactions";
import AddedByBadge from "./AddedByBadge";
import { Picker } from "./ui/Picker";

const ICON_BTN = "size-9 grid place-items-center rounded-full text-(--ink-soft) transition-colors hover:bg-brand-soft hover:text-(--brand-text)";

export default function Budgets({ budgets, transactions, onAdd, onRemove, onUpdateLimit, extraCategories = [], viewerId }: {
  budgets: BudgetItem[];
  transactions: TransactionItem[];
  onAdd: (b: Omit<BudgetItem, "id">) => void;
  onRemove: (id: string) => void;
  onUpdateLimit?: (id: string, monthlyLimit: number) => void;
  extraCategories?: string[];
  viewerId?: string;
}) {
  const catList = [...EXPENSE_CATEGORIES.slice(0, -1), ...extraCategories, "Otros"];
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const commitEdit = (id: string) => {
    const parsed = round2(parseFloat(editValue));
    if (Number.isFinite(parsed) && parsed > 0 && onUpdateLimit) onUpdateLimit(id, parsed);
    setEditingId(null);
    setEditValue("");
  };

  const spent = useMemo(
    () => spentByCategory(transactions, monthKey(new Date())),
    [transactions],
  );

  const available = catList.filter((c) => !budgets.some((b) => b.category === c));
  // La categoría elegida solo vale si sigue libre; si no (por ejemplo al recargar, cuando
  // Comida ya tiene presupuesto), se usa la primera libre. Antes el selector se veía vacío
  // pero conservaba "Comida" y "Crear" duplicaba el presupuesto.
  const effectiveCategory = available.includes(category) ? category : (available[0] ?? "");
  const limitValid = limit !== "" && Number.isFinite(parseFloat(limit)) && parseFloat(limit) > 0;

  const submit = () => {
    if (!limitValid || !effectiveCategory) return;
    if (budgets.some((b) => b.category === effectiveCategory)) return;
    onAdd({ category: effectiveCategory, monthlyLimit: round2(parseFloat(limit)) });
    setLimit("");
  };

  return (
    <section className="pop-card">
      <div className="sec-h">
        <h2 className="sec">Presupuestos del mes</h2>
        <span className="chip capitalize">{new Date().toLocaleDateString("es-MX", { month: "long" })}</span>
      </div>

      {budgets.length === 0 ? (
        <div className="empty">Sin presupuestos. Ej. Comida $3,000 al mes; te avisamos al 80%.</div>
      ) : (
        <div className="bud">
          {budgets.map((b) => {
            const used = spent.get(b.category) || 0;
            const pct = b.monthlyLimit > 0 ? (used / b.monthlyLimit) * 100 : 0;
            const over = pct >= 100;
            const near = pct >= 80 && !over;
            const left = b.monthlyLimit - used;
            return (
              <div key={b.id} className="r">
                <div className="flex items-start justify-between gap-1">
                  <b className="flex items-center gap-1.5 flex-wrap pt-1">
                    {b.category}
                    <AddedByBadge addedBy={b.addedBy} viewerId={viewerId} />
                  </b>
                  <div className="flex items-center -mr-2 -mt-1">
                    {onUpdateLimit && (
                      <button
                        onClick={() => { setEditingId(b.id); setEditValue(String(b.monthlyLimit)); }}
                        className={ICON_BTN}
                        aria-label={`Editar límite de ${b.category}`}
                      >
                        <Pencil size={14} aria-hidden />
                      </button>
                    )}
                    <button
                      onClick={() => onRemove(b.id)}
                      className={ICON_BTN}
                      aria-label={`Eliminar presupuesto de ${b.category}`}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </div>
                </div>

                {editingId === b.id ? (
                  <div className="flex items-center gap-1.5 my-1.5">
                    <input
                      className="field-pill" type="number" min="0" inputMode="decimal"
                      value={editValue} onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(b.id); }}
                      aria-label="Nuevo límite" placeholder="$ 0.00"
                    />
                    <button
                      type="button" className="btn sm size-11 !px-0 shrink-0"
                      onClick={() => commitEdit(b.id)} aria-label="Guardar límite"
                    >
                      <Check size={16} aria-hidden />
                    </button>
                  </div>
                ) : (
                  <div className="v">{money(used)} <small>de {money(b.monthlyLimit)}</small></div>
                )}

                {/* El avance va en pop1; ámbar desde el 80% y rojo al pasarse */}
                <div
                  className="tr" role="progressbar" aria-label={`Gastado de ${b.category}`}
                  aria-valuenow={Math.min(100, Math.round(pct))} aria-valuemin={0} aria-valuemax={100}
                >
                  <span className={over ? "over" : near ? "warn" : ""} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <small className={`left ${left < 0 ? "text-money-out-text" : "text-money-in-text"}`}>
                  {left < 0 ? `Te pasaste ${money(-left)}` : `${near ? "Casi al límite. " : ""}Te quedan ${money(left)}`}
                </small>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <Picker
          className="sm:flex-1" label="Categoría"
          disabled={available.length === 0}
          value={effectiveCategory}
          placeholder="Ya tienes presupuesto en todas"
          onChange={(v) => { if (v) setCategory(v); }}
          options={available.map((c) => ({ value: c, label: c }))}
        />
        <input
          className="field-pill sm:w-44" type="number" min="0" inputMode="decimal"
          placeholder="Límite mensual $" aria-label="Límite mensual"
          value={limit} onChange={(e) => setLimit(e.target.value)}
        />
        <button type="button" className="btn soft sm" disabled={!limitValid || !effectiveCategory} onClick={submit}>
          Crear presupuesto
        </button>
      </div>
    </section>
  );
}
