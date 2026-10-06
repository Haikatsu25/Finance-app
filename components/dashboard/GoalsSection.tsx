"use client";

import { useState } from "react";
import { Card, CardHeader, CardBody, Input, Button } from "@heroui/react";
import { Plus, Trash2, Pencil, Target, Check } from "lucide-react";
import { GoalItem } from "@/types";
import { moneySmart, round2 } from "@/lib/format";
import AddedByBadge from "../AddedByBadge";
import { TONE } from "./tone";

// ─────────────────────────────────────────────────────────────────────────────
// ABONO A META — con botón, no solo Enter
// ─────────────────────────────────────────────────────────────────────────────
function GoalContribution({ current, label, onContribute }: {
  current: number; label: string; onContribute: (v: number) => void;
}) {
  const [value, setValue] = useState("");
  const parsed = parseFloat(value);
  const valid = value !== "" && Number.isFinite(parsed) && parsed > 0;

  const commit = () => {
    if (!valid) return;
    onContribute(round2(parsed));
    setValue("");
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        size="sm"
        variant="faded"
        placeholder="Abonar $"
        aria-label={`Abonar a ${label}`}
        className="w-24"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={value}
        onValueChange={setValue}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
      />
      <Button
        isIconOnly size="sm" variant="flat" color="secondary"
        className="min-w-8 h-8 bg-foreground text-background"
        isDisabled={!valid}
        onPress={commit}
        aria-label={`Guardar abono a ${label}`}
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GOALS SECTION
// ─────────────────────────────────────────────────────────────────────────────
export function GoalsSection({ items, onAdd, onRemove, onUpdateProgress, viewerId, onEdit }: {
  items: GoalItem[];
  onAdd: (label: string, target: string, deadline: string) => void;
  onRemove: (id: string) => void;
  onUpdateProgress: (id: string, newAmount: string) => void;
  viewerId?: string;
  onEdit?: (id: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  const t = TONE.purple;

  const handleAdd = () => {
    if (!label.trim() || !targetAmount || !deadline) return;
    onAdd(label.trim(), targetAmount, deadline);
    setLabel("");
    setTargetAmount("");
    setDeadline("");
  };

  return (
    <Card className={`glass card-hover ${t.rule} col-span-1 sm:col-span-2 lg:col-span-3 shadow-none`}>
      <CardHeader className="flex flex-col items-start px-5 pt-4 pb-0 gap-0.5">
        <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
          <Target size={18} className={`${t.text} shrink-0`} aria-hidden />
          Metas de ahorro
        </h3>
        <p className="text-xs text-default-500">Rastrea tu progreso hacia objetivos específicos</p>
      </CardHeader>

      <CardBody className="px-5 py-4 flex flex-col gap-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-default-300 rounded-lg text-default-500 gap-1">
            <p className="text-xs font-semibold">Sin metas activas</p>
            <p className="text-[11px]">Un viaje, un auto, tu fondo de emergencia…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const progress = item.targetAmount > 0
                ? Math.min(100, (item.currentAmount / item.targetAmount) * 100)
                : 0;
              const done = progress >= 100;
              return (
                <div key={item.id} className="relative group p-4 rounded-lg border border-default-200 bg-background/60 hover:border-foreground transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold flex items-center gap-1.5 flex-wrap">
                      {item.label}
                      {done && <Check size={14} className="text-money-in-text" aria-label="Meta cumplida" />}
                      <AddedByBadge addedBy={item.addedBy} viewerId={viewerId} />
                    </span>
                    <div className="flex items-center">
                      {onEdit && (
                        <button
                          onClick={() => onEdit(item.id)}
                          className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 text-default-500 hover:text-foreground transition-colors p-1"
                          aria-label={`Editar meta ${item.label}`}
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => onRemove(item.id)}
                        className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 text-default-500 hover:text-money-out-text transition-colors p-1"
                        aria-label={`Eliminar meta ${item.label}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-default-500 tnum mb-1">
                    <span className="text-money-hold-text font-bold">{moneySmart(item.currentAmount)}</span>
                    <span>{moneySmart(item.targetAmount)}</span>
                  </div>
                  <div className="h-2.5 rounded-sm bg-default-200 mb-2 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className={`h-full rounded-sm transition-all duration-500 ${done ? "bg-money-in" : "bg-money-hold"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-3 gap-2">
                    <span className="text-[11px] text-default-500 shrink-0">Meta: {item.deadline}</span>
                    <GoalContribution
                      current={item.currentAmount}
                      label={item.label}
                      onContribute={(v) => onUpdateProgress(item.id, round2(item.currentAmount + v).toString())}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-default-200/50 mt-2">
          <Input placeholder="Ej. Viaje, Auto" size="sm" variant="bordered" value={label} onValueChange={setLabel} className="flex-1" />
          <Input type="number" min="0" step="0.01" inputMode="decimal" placeholder="Monto Meta ($)" size="sm" variant="bordered" value={targetAmount} onValueChange={setTargetAmount} className="w-full sm:w-36" />
          <Input type="date" size="sm" variant="bordered" aria-label="Fecha límite" value={deadline} onValueChange={setDeadline} className="w-full sm:w-36" />
          <Button variant="solid" onPress={handleAdd} isDisabled={!label.trim() || !targetAmount || !deadline} className="font-bold bg-foreground text-background">
            Crear Meta
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
