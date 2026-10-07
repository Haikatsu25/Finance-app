"use client";

import { useState } from "react";
import { Trash2, Pencil, Check } from "lucide-react";
import { GoalItem } from "@/types";
import { moneySmart, round2 } from "@/lib/format";
import AddedByBadge from "../AddedByBadge";

// ─────────────────────────────────────────────────────────────────────────────
// ABONO A META — con botón, no solo Enter
// ─────────────────────────────────────────────────────────────────────────────
function GoalContribution({ label, onContribute }: {
  label: string; onContribute: (v: number) => void;
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
    <div className="flex gap-2">
      <input
        className="field-pill flex-1" type="number" min="0" step="0.01" inputMode="decimal"
        placeholder="Abonar $" aria-label={`Abonar a ${label}`}
        value={value} onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
      />
      <button type="button" className="btn sm" disabled={!valid} onClick={commit} aria-label={`Guardar abono a ${label}`}>
        Guardar abono
      </button>
    </div>
  );
}

// Meses que faltan hasta la fecha de la meta (mínimo 1)
function monthsLeft(deadline: string): number {
  const d = new Date(deadline + "T12:00:00");
  if (isNaN(d.getTime())) return 1;
  return Math.max(1, Math.round((d.getTime() - Date.now()) / 2_592_000_000));
}

// ─────────────────────────────────────────────────────────────────────────────
// METAS DE AHORRO
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

  const handleAdd = () => {
    if (!label.trim() || !targetAmount || !deadline) return;
    onAdd(label.trim(), targetAmount, deadline);
    setLabel("");
    setTargetAmount("");
    setDeadline("");
  };

  return (
    <section className="pop-card">
      <div className="sec-h">
        <h2 className="sec">Metas de ahorro</h2>
      </div>

      {items.length === 0 ? (
        <div className="empty">Sin metas activas. Un viaje, un auto, tu fondo de emergencia…</div>
      ) : (
        <div className="flex flex-col gap-5">
          {items.map((item) => {
            const progress = item.targetAmount > 0 ? Math.min(100, (item.currentAmount / item.targetAmount) * 100) : 0;
            const done = progress >= 100;
            const perMonth = Math.ceil(Math.max(0, item.targetAmount - item.currentAmount) / monthsLeft(item.deadline));
            return (
              <div key={item.id} className="goal">
                <div className="l">
                  <b className="flex items-center gap-1.5 flex-wrap">
                    {item.label}
                    {done && <Check size={14} className="text-money-in-text" aria-label="Meta cumplida" />}
                    <AddedByBadge addedBy={item.addedBy} viewerId={viewerId} />
                  </b>
                  <span className="flex items-center gap-1">
                    Meta {item.deadline}
                    {onEdit && (
                      <button
                        type="button" onClick={() => onEdit(item.id)} aria-label={`Editar meta ${item.label}`}
                        className="grid place-items-center size-9 rounded-full hover:bg-brand-soft"
                      >
                        <Pencil size={14} aria-hidden />
                      </button>
                    )}
                    <button
                      type="button" onClick={() => onRemove(item.id)} aria-label={`Eliminar meta ${item.label}`}
                      className="grid place-items-center size-9 rounded-full hover:bg-brand-soft"
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  </span>
                </div>
                <div className="tr" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso de ${item.label}`}>
                  <span style={{ width: `${progress}%` }} />
                </div>
                <div className="l">
                  <span className="tnum">
                    <b className="text-money-in-text text-[13px]">{moneySmart(item.currentAmount)}</b> de {moneySmart(item.targetAmount)}
                  </span>
                  {!done && <span>Aparta {moneySmart(perMonth)}/mes</span>}
                </div>
                <GoalContribution
                  label={item.label}
                  onContribute={(v) => onUpdateProgress(item.id, round2(item.currentAmount + v).toString())}
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        <input className="field-pill" placeholder="Ej. Viaje, Auto" aria-label="Nombre de la meta" value={label} onChange={(e) => setLabel(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className="field-pill" type="number" min="0" step="0.01" inputMode="decimal" placeholder="Monto de la meta $" aria-label="Monto de la meta" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
          <input className="field-pill" type="date" aria-label="Fecha límite" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <button type="button" className="btn sm" onClick={handleAdd} disabled={!label.trim() || !targetAmount || !deadline}>
          Crear meta
        </button>
      </div>
    </section>
  );
}
