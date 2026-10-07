"use client";

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { Sheet } from "./Sheet";

export type PickerOption = { value: string; label: string; disabled?: boolean };

/**
 * Selector Pop (reemplaza al <select> nativo). El disparador es una píldora con el valor
 * COMPLETO (se ajusta en varias líneas, nunca se trunca) y un chevron. En móvil abre una hoja con
 * filas de 48px y palomita a la derecha; en escritorio (≥900px) un menú flotante con el mismo estilo.
 */
export function Picker({ value, onChange, options, label, id, placeholder = "Elige…", disabled = false, variant = "pill", title, className = "" }: {
  value: string;
  onChange: (value: string) => void;
  options: PickerOption[];
  /** Nombre accesible del disparador (y título de la hoja si no se da `title`) */
  label: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  /** "pill": campo en píldora (filas de agregar). "field": campo de formulario de las hojas */
  variant?: "pill" | "field";
  title?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number; maxHeight: number } | null>(null);
  const listId = useId();

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(min-width: 900px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const selected = options.find((o) => o.value === value);
  const close = () => setOpen(false);

  const choose = (o: PickerOption) => {
    if (o.disabled) return;
    onChange(o.value);
    close();
    btnRef.current?.focus({ preventScroll: true });
  };

  // Menú flotante: se coloca bajo el disparador (o arriba si abajo no cabe)
  useLayoutEffect(() => {
    if (!open || !desktop) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const below = window.innerHeight - r.bottom - 12;
      const above = r.top - 12;
      const up = below < 220 && above > below;
      const width = Math.max(r.width, 220);
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8);
      setPos(up
        ? { left, bottom: window.innerHeight - r.top + 6, width, maxHeight: Math.min(320, above - 6) }
        : { left, top: r.bottom + 6, width, maxHeight: Math.min(320, below - 6) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open, desktop]);

  // Menú flotante: cerrar al tocar fuera o con Escape; enfocar la opción activa
  useEffect(() => {
    if (!open || !desktop) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); close(); btnRef.current?.focus({ preventScroll: true }); }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    const t = setTimeout(() => (menuRef.current?.querySelector<HTMLElement>("[aria-selected='true']") ?? menuRef.current?.querySelector<HTMLElement>("[role='option']"))?.focus({ preventScroll: true }), 0);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey, true); clearTimeout(t); };
  }, [open, desktop]);

  const onListKey = (e: React.KeyboardEvent) => {
    const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[role='option']:not([aria-disabled='true'])"));
    const i = rows.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); rows[Math.min(rows.length - 1, i + 1)]?.focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); rows[Math.max(0, i - 1)]?.focus(); }
    else if (e.key === "Home") { e.preventDefault(); rows[0]?.focus(); }
    else if (e.key === "End") { e.preventDefault(); rows[rows.length - 1]?.focus(); }
  };

  const rows = options.map((o) => (
    <button
      key={o.value} type="button" role="option" className="pk-opt"
      aria-selected={o.value === value} aria-disabled={o.disabled || undefined}
      onClick={() => choose(o)}
    >
      <span>{o.label}</span>
      {o.value === value && <Check size={20} aria-hidden />}
    </button>
  ));

  return (
    <>
      <button
        ref={btnRef} id={id} type="button" disabled={disabled}
        className={`pk-btn ${variant === "field" ? "pk-field" : "pk-pill"} ${className}`}
        role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (e.key === "ArrowDown" && !open) { e.preventDefault(); setOpen(true); } }}
      >
        <span className={selected ? "pk-val" : "pk-val pk-ph"}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={18} aria-hidden className="pk-chev" />
      </button>

      {mounted && !desktop && (
        <Sheet open={open} onOpenChange={setOpen} title={title ?? label}>
          <div id={listId} role="listbox" aria-label={label} className="pk-list" onKeyDown={onListKey}>{rows}</div>
        </Sheet>
      )}

      {mounted && desktop && open && pos && createPortal(
        <div
          ref={menuRef} id={listId} role="listbox" aria-label={label} className="pk-menu" onKeyDown={onListKey}
          style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: pos.width, maxHeight: pos.maxHeight }}
        >
          {rows}
        </div>,
        document.body,
      )}
    </>
  );
}
