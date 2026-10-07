"use client";

import { Check } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { FinanceItem } from "@/types";
import { QUICK_CATEGORIES, type EditKind } from "./quickAdd";
import { Picker } from "../ui/Picker";

export function EditModal({
  editTarget, setEditTarget, liabilities, onSave,
  eLabel, setELabel, eAmount, setEAmount, eDate, setEDate, eCategory, setECategory,
  eCycle, setECycle, eTarget, setETarget, eCurrent, setECurrent, eDeadline, setEDeadline,
}: {
  editTarget: { kind: EditKind; id: string } | null;
  setEditTarget: (target: { kind: EditKind; id: string } | null) => void;
  liabilities: FinanceItem[];
  onSave: () => void;
  eLabel: string;
  setELabel: (v: string) => void;
  eAmount: string;
  setEAmount: (v: string) => void;
  eDate: string;
  setEDate: (v: string) => void;
  eCategory: string;
  setECategory: (v: string) => void;
  eCycle: "mensual" | "anual";
  setECycle: (v: "mensual" | "anual") => void;
  eTarget: string;
  setETarget: (v: string) => void;
  eCurrent: string;
  setECurrent: (v: string) => void;
  eDeadline: string;
  setEDeadline: (v: string) => void;
}) {
  const close = () => setEditTarget(null);
  const kind = editTarget?.kind;

  return (
    <Sheet open={editTarget !== null} onOpenChange={(o) => { if (!o) close(); }} title="Editar registro">
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); onSave(); close(); }}>
        <div className="f">
          <label htmlFor="ed-label">Descripción</label>
          <input id="ed-label" value={eLabel} onChange={(e) => setELabel(e.target.value)} />
        </div>

        {(kind === "asset" || kind === "liability" || kind === "bucket") && (
          <>
            <div className="row2">
              <div className="f">
                <label htmlFor="ed-amount">Monto</label>
                <input id="ed-amount" type="number" min="0" step="0.01" inputMode="decimal" value={eAmount} onChange={(e) => setEAmount(e.target.value)} />
              </div>
              <div className="f">
                <label htmlFor="ed-date">Fecha</label>
                <input id="ed-date" type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} />
              </div>
            </div>
            <div className="f">
              <label htmlFor="ed-cat">Categoría</label>
              <Picker id="ed-cat" variant="field" label="Categoría" value={eCategory} onChange={setECategory}
                options={QUICK_CATEGORIES[kind].map((c) => ({ value: c, label: c }))} />
            </div>
            {kind === "liability" && editTarget && liabilities.find((l) => l.id === editTarget.id)?.cardId && (
              <p className="callout">
                Este gasto está ligado a una tarjeta: al cambiar el monto, la deuda de la tarjeta se ajusta por la diferencia.
              </p>
            )}
          </>
        )}

        {kind === "sub" && (
          <div className="row2">
            <div className="f">
              <label htmlFor="ed-amount">Monto</label>
              <input id="ed-amount" type="number" min="0" step="0.01" inputMode="decimal" value={eAmount} onChange={(e) => setEAmount(e.target.value)} />
            </div>
            <div className="f">
              <label htmlFor="ed-cycle">Ciclo</label>
              <Picker id="ed-cycle" variant="field" label="Ciclo" value={eCycle} onChange={(v) => setECycle(v === "anual" ? "anual" : "mensual")}
                options={[{ value: "mensual", label: "Mensual" }, { value: "anual", label: "Anual" }]} />
            </div>
          </div>
        )}

        {kind === "goal" && (
          <>
            <div className="row2">
              <div className="f">
                <label htmlFor="ed-target">Monto de la meta</label>
                <input id="ed-target" type="number" min="0" step="0.01" inputMode="decimal" value={eTarget} onChange={(e) => setETarget(e.target.value)} />
              </div>
              <div className="f">
                <label htmlFor="ed-current">Llevo ahorrado</label>
                <input id="ed-current" type="number" min="0" step="0.01" inputMode="decimal" value={eCurrent} onChange={(e) => setECurrent(e.target.value)} />
              </div>
            </div>
            <div className="f">
              <label htmlFor="ed-deadline">Fecha límite</label>
              <input id="ed-deadline" type="date" value={eDeadline} onChange={(e) => setEDeadline(e.target.value)} />
            </div>
          </>
        )}

        <div className="ft">
          <button type="button" className="btn soft" onClick={close}>Cancelar</button>
          <button type="submit" className="btn"><Check size={16} aria-hidden /> Guardar cambios</button>
        </div>
      </form>
    </Sheet>
  );
}
