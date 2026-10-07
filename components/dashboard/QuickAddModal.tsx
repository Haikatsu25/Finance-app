"use client";

import { useEffect, useRef, useState } from "react";
import { Delete } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { QUICK_CATEGORIES, type QuickAddType } from "./quickAdd";

const TYPES: { id: QuickAddType; label: string; seg: "in" | "out" | "hold"; hint: string }[] = [
  { id: "asset",     label: "Activo",   seg: "in",   hint: "Monto de la cuenta" },
  { id: "liability", label: "Gasto",    seg: "out",  hint: "Monto del gasto" },
  { id: "bucket",    label: "Apartado", seg: "hold", hint: "Monto a apartar" },
];

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

/** Aplica una tecla al monto: máx. 9 dígitos y 2 decimales, un solo punto, sin ceros a la izquierda */
function press(value: string, key: string): string {
  if (key === "⌫") return value.slice(0, -1);
  if (key === ".") return value.includes(".") ? value : `${value || "0"}.`;
  if (/\.\d\d$/.test(value)) return value;
  if (value.replace(".", "").length >= 9) return value;
  return (value === "0" ? "" : value) + key;
}

/** "1234.5" → "1,234.5" (la parte decimal tal cual se escribió) */
function grouped(value: string): { int: string; dec: string | null } {
  const [i, d] = value.split(".");
  return { int: (i || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ","), dec: d === undefined ? null : d };
}

export function QuickAddModal({
  isOpen, onOpenChange, onSubmit,
  quickType, setQuickType, quickLabel, setQuickLabel,
  quickAmount, setQuickAmount, quickCategory, setQuickCategory, quickAmountValid,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (close: () => void) => void;
  quickType: QuickAddType;
  setQuickType: (t: QuickAddType) => void;
  quickLabel: string;
  setQuickLabel: (v: string) => void;
  quickAmount: string;
  setQuickAmount: (v: string) => void;
  quickCategory: string;
  setQuickCategory: (v: string) => void;
  quickAmountValid: boolean;
}) {
  const close = () => onOpenChange(false);
  // Los avisos solo salen después de tocar Agregar (no mientras se escribe)
  const [tried, setTried] = useState(false);
  useEffect(() => { if (!isOpen) setTried(false); }, [isOpen]);
  const labelMissing = !quickLabel.trim();
  const typed = useRef(0); // cuántos caracteres tenía la última pulsación, para animar solo el nuevo
  const current = TYPES.find((t) => t.id === quickType) ?? TYPES[1];
  const { int, dec } = grouped(quickAmount);
  const chars = quickAmount ? [...int, ...(dec !== null ? [".", ...dec] : [])] : [];

  const tap = (k: string) => {
    typed.current = k === "⌫" ? 0 : 1;
    setQuickAmount(press(quickAmount, k));
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange} title="Registro rápido">
      <div className={`seg ${current.seg}`} role="group" aria-label="Tipo de registro">
        {TYPES.map((opt) => (
          <button
            key={opt.id} type="button" aria-pressed={quickType === opt.id}
            onClick={() => { setQuickType(opt.id); setQuickCategory(QUICK_CATEGORIES[opt.id][0]); }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Monto: teclado numérico propio; cada dígito nuevo "brota" */}
      <div className="kp-amt">
        <div className={`v ${quickAmount ? "" : "empty"} ${tried && !quickAmountValid ? "err-shake" : ""}`} role="status" aria-label={quickAmount ? `Monto: ${quickAmount} pesos` : "Monto vacío"}>
          <i>$</i>
          {quickAmount
            ? chars.map((ch, idx) => <i key={idx} className={idx === chars.length - 1 && typed.current ? "pop" : ""}>{ch}</i>)
            : <i>0.00</i>}
        </div>
        {tried && !quickAmountValid
          ? <small className="text-money-out-text" role="alert">Escribe un monto mayor a 0</small>
          : <small>{current.hint}</small>}
      </div>

      <div className="kp">
        {KEYS.map((k) => (
          <button key={k} type="button" aria-label={k === "⌫" ? "Borrar" : k} onClick={() => tap(k)}>
            {k === "⌫" ? <Delete size={20} aria-hidden /> : k}
          </button>
        ))}
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          // Siempre activo: si falta algo, marca qué corregir en vez de quedarse mudo
          if (labelMissing || !quickAmountValid) { setTried(true); return; }
          onSubmit(close);
        }}
      >
        <div className="row2">
          <div className="f">
            <label htmlFor="quick-label">¿En qué?</label>
            <input
              id="quick-label" placeholder="Ej. Tacos, Nómina" value={quickLabel} onChange={(e) => setQuickLabel(e.target.value)}
              className={tried && labelMissing ? "err" : ""} aria-invalid={tried && labelMissing} aria-describedby={tried && labelMissing ? "quick-label-err" : undefined}
            />
            {tried && labelMissing && <p id="quick-label-err" className="err-msg" role="alert">Dime en qué fue</p>}
          </div>
          <div className="f">
            <label htmlFor="quick-cat">Categoría</label>
            <select id="quick-cat" value={quickCategory} onChange={(e) => setQuickCategory(e.target.value || QUICK_CATEGORIES[quickType][0])}>
              {QUICK_CATEGORIES[quickType].map((cat) => <option key={cat}>{cat}</option>)}
            </select>
          </div>
        </div>
        <div className="ft">
          <button type="button" className="btn soft" onClick={close}>Cancelar</button>
          <button type="submit" className="btn">Agregar</button>
        </div>
      </form>
    </Sheet>
  );
}
