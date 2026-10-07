"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

const SPRING: [number, number, number, number] = [0.22, 1.1, 0.3, 1];
const EASE: [number, number, number, number] = [0.2, 0.8, 0.2, 1];

// Cuántas hojas hay abiertas: mientras haya una, la app de atrás se encoge (html[data-sheet])
let openCount = 0;
function markOpen(delta: 1 | -1) {
  openCount = Math.max(0, openCount + delta);
  const open = openCount > 0;
  if (open) document.documentElement.setAttribute("data-sheet", "open");
  else document.documentElement.removeAttribute("data-sheet");
  // Con una hoja abierta lo de atrás no se puede enfocar ni tocar (comportamiento modal)
  document.querySelectorAll(".app-col, .app-nav, .fab").forEach((el) => {
    if (open) el.setAttribute("inert", "");
    else el.removeAttribute("inert");
  });
}

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Hoja modal. En móvil sube desde abajo; en escritorio (≥900px) aparece centrada.
 * Se cierra con Escape, tocando el fondo o con el botón de cerrar (44px). Atrapa el foco, lo
 * devuelve al botón que la abrió y bloquea el scroll de la página. Respeta "reducir movimiento".
 */
export function Sheet({ open, onOpenChange, title, children, dismissable = true, hideClose = false, wide = false }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  children: React.ReactNode;
  dismissable?: boolean;
  hideClose?: boolean;
  wide?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const reduce = useReducedMotion();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(min-width: 900px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Escala la app de atrás y bloquea el scroll mientras la hoja está abierta
  useEffect(() => {
    if (!open) return;
    markOpen(1);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const t = setTimeout(() => {
      const el = panelRef.current;
      if (!el) return;
      // Si la persona ya empezó a escribir en otro campo, no le quitamos el foco
      if (el.contains(document.activeElement) && document.activeElement !== el) return;
      const first = el.querySelector<HTMLElement>("[data-autofocus]") ?? el.querySelector<HTMLElement>("input, select, textarea");
      (first ?? el.querySelector<HTMLElement>("button:not([data-sheet-close])") ?? el).focus({ preventScroll: true });
    }, 60);
    return () => {
      clearTimeout(t);
      markOpen(-1);
      document.body.style.overflow = prev;
      returnTo.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const close = () => onOpenChange(false);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && dismissable) { e.stopPropagation(); close(); return; }
    if (e.key !== "Tab") return;
    const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter((n) => n.offsetParent !== null);
    if (nodes.length === 0) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  if (!mounted) return null;

  const hidden = desktop ? { y: 40, scale: 0.96, opacity: 0 } : { y: "100%" };
  const shown = { y: 0, scale: 1, opacity: 1 };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          className="scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
          onMouseDown={(e) => { if (e.target === e.currentTarget && dismissable) close(); }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={`sheet ${wide ? "sheet-wide" : ""}`}
            initial={reduce ? shown : hidden}
            animate={shown}
            exit={reduce ? shown : hidden}
            transition={{ duration: reduce ? 0 : 0.5, ease: SPRING }}
            onKeyDown={onKeyDown}
          >
            <div className="grab" aria-hidden />
            <div className="hd">
              <b id={titleId}>{title}</b>
              {!hideClose && (
                <button type="button" data-sheet-close aria-label="Cerrar" onClick={close}>
                  <X size={18} aria-hidden />
                </button>
              )}
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
