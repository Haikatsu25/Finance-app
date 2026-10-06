"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardBody, Input, Button, Select, SelectItem } from "@heroui/react";
import { PiggyBank, Plus, Trash2, AlertTriangle, Pencil, Check } from "lucide-react";
import { BudgetItem, TransactionItem } from "@/types";
import { money, round2 } from "@/lib/format";
import { monthKey, spentByCategory } from "@/lib/finance-utils";
import { EXPENSE_CATEGORIES } from "./Transactions";
import AddedByBadge from "./AddedByBadge";

const ICON_BTN = "opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 w-11 h-11 grid place-items-center rounded-lg text-default-500 transition-colors hover:bg-foreground/10";

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
    <Card className="glass card-hover rule-out col-span-1 sm:col-span-2 lg:col-span-3 shadow-none">
      <CardHeader className="flex flex-col items-start px-5 pt-4 pb-0 gap-0.5">
        <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
          <PiggyBank size={18} className="text-money-out-text shrink-0" aria-hidden />
          Presupuestos del mes
        </h3>
        <p className="text-xs text-default-500">Límite por categoría, calculado con tus movimientos</p>
      </CardHeader>

      <CardBody className="px-5 py-4 flex flex-col gap-4">
        {budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-default-300 rounded-lg text-default-500 gap-1">
            <p className="text-xs font-semibold">Sin presupuestos</p>
            <p className="text-[11px]">Ej. Comida $3,000 al mes. Te avisamos al 80%</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {budgets.map((b) => {
              const used = spent.get(b.category) || 0;
              const pct = b.monthlyLimit > 0 ? (used / b.monthlyLimit) * 100 : 0;
              const over = pct >= 100;
              const near = pct >= 80 && !over;
              return (
                <div key={b.id} className="group p-4 rounded-lg border border-default-200 bg-background/60 hover:border-foreground transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-sm font-bold flex items-center gap-1.5 flex-wrap pt-0.5">
                      {b.category}
                      <AddedByBadge addedBy={b.addedBy} viewerId={viewerId} />
                    </span>
                    <div className="flex items-center -mr-2.5 -mt-2.5">
                      {onUpdateLimit && (
                        <button
                          onClick={() => { setEditingId(b.id); setEditValue(String(b.monthlyLimit)); }}
                          className={`${ICON_BTN} hover:text-foreground`}
                          aria-label={`Editar límite de ${b.category}`}
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => onRemove(b.id)}
                        className={`${ICON_BTN} hover:text-money-out-text`}
                        aria-label={`Eliminar presupuesto de ${b.category}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-end gap-2 mt-1">
                    <span className="figure text-[1.75rem]">{money(used)}</span>
                    {editingId === b.id ? (
                      <span className="flex items-center gap-1.5">
                        <Input
                          size="md" type="number" min="0" inputMode="decimal" variant="bordered"
                          value={editValue} onValueChange={setEditValue}
                          onKeyDown={(e) => { if (e.key === "Enter") commitEdit(b.id); }}
                          className="w-28" aria-label="Nuevo límite"
                          startContent={<span className="text-default-500 text-xs">$</span>}
                        />
                        <Button isIconOnly color="primary" variant="solid" className="min-w-11 w-11 h-11"
                          onPress={() => commitEdit(b.id)} aria-label="Guardar límite">
                          <Check size={16} />
                        </Button>
                      </span>
                    ) : (
                      <span className="text-xs text-default-600 tnum pb-1">de {money(b.monthlyLimit)}</span>
                    )}
                  </div>

                  {/* El avance siempre va en el token de salida: es dinero que ya salió. El aviso
                      del 80% y el exceso se dicen con ícono y texto, no con otro color. */}
                  <div className="h-2.5 rounded-sm bg-default-200 mt-2 overflow-hidden" role="progressbar"
                    aria-label={`Gastado de ${b.category}`}
                    aria-valuenow={Math.min(100, Math.round(pct))} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-sm bg-money-out transition-all duration-500"
                      style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <p className="text-xs mt-2 flex items-center gap-1.5 tnum">
                    {over ? (
                      <>
                        <AlertTriangle size={13} className="shrink-0 text-money-out-text" aria-hidden />
                        <span className="text-money-out-text font-bold">Excedido por {money(used - b.monthlyLimit)}</span>
                      </>
                    ) : (
                      <>
                        {near && <AlertTriangle size={13} className="shrink-0" aria-hidden />}
                        {near && <span className="font-bold">Casi al límite.</span>}
                        <span className="text-money-in-text font-bold">Te quedan {money(b.monthlyLimit - used)}</span>
                        <span className="text-default-600">este mes</span>
                      </>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-default-200">
          <Select size="md" variant="bordered" aria-label="Categoría" className="flex-1"
            isDisabled={available.length === 0}
            placeholder={available.length === 0 ? "Ya tienes presupuesto en todas" : undefined}
            selectedKeys={effectiveCategory ? [effectiveCategory] : []}
            onChange={(e) => { if (e.target.value) setCategory(e.target.value); }}>
            {available.map((c) => <SelectItem key={c}>{c}</SelectItem>)}
          </Select>
          <Input type="number" min="0" inputMode="decimal" placeholder="Límite mensual $" size="md" variant="bordered"
            aria-label="Límite mensual" className="w-full sm:w-44" value={limit} onValueChange={setLimit} />
          <Button color="primary" variant="solid" className="font-bold h-12 sm:h-auto min-h-11"
            isDisabled={!limitValid || !effectiveCategory} startContent={<Plus size={16} />} onPress={submit}>
            Crear presupuesto
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
