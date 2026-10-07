"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const EASE: [number, number, number, number] = [0.2, 0.8, 0.2, 1];
const SPRING: [number, number, number, number] = [0.22, 1.1, 0.3, 1];
const EVENT = "fc:celebrate";

export type Celebration = {
  amount: string;
  text: string;
  /** "paid" = verde de marca; "transfer" = azul */
  tone: "paid" | "transfer";
  /** Punto desde donde se abre el círculo (el botón que se tocó) */
  x?: number;
  y?: number;
};

/** Dispara la confirmación a pantalla completa desde cualquier parte de la app. */
export function celebrate(c: Celebration) {
  window.dispatchEvent(new CustomEvent<Celebration>(EVENT, { detail: c }));
}

/** Punto central de un botón, para abrir el círculo desde ahí */
export function originOf(el: Element | null | undefined): { x: number; y: number } {
  if (!el) return { x: window.innerWidth / 2, y: window.innerHeight * 0.8 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * Confirmación (Pagado, Transferir): un círculo del color de la acción se expande desde el botón
 * hasta cubrir la pantalla en 650ms, se dibuja la palomita y se muestra el monto en 36px. Se
 * cierra sola a los 2.6s o al tocar. Con "reducir movimiento" aparece sin animación.
 */
export function SuccessReveal() {
  const [data, setData] = useState<Celebration | null>(null);
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();

  const close = useCallback(() => setData(null), []);

  useEffect(() => {
    setMounted(true);
    const on = (e: Event) => setData((e as CustomEvent<Celebration>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  useEffect(() => {
    if (!data) return;
    const t = setTimeout(close, 2600);
    return () => clearTimeout(t);
  }, [data, close]);

  if (!mounted) return null;

  const x = data?.x ?? (typeof window !== "undefined" ? window.innerWidth / 2 : 0);
  const y = data?.y ?? (typeof window !== "undefined" ? window.innerHeight * 0.8 : 0);

  return createPortal(
    <AnimatePresence>
      {data && (
        <motion.div
          key="success"
          className={`success ${data.tone}`}
          role="status"
          onClick={close}
          initial={reduce ? { clipPath: `circle(150% at ${x}px ${y}px)` } : { clipPath: `circle(0px at ${x}px ${y}px)` }}
          animate={{ clipPath: `circle(150% at ${x}px ${y}px)` }}
          exit={reduce ? { opacity: 0 } : { clipPath: `circle(0px at ${x}px ${y}px)` }}
          transition={{ duration: reduce ? 0 : 0.65, ease: EASE }}
        >
          <motion.div
            className="ck"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.3, duration: 0.35, ease: SPRING }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <motion.path
                d="M5 12l5 5L20 7"
                initial={reduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: reduce ? 0 : 0.35, duration: 0.5, ease: EASE }}
              />
            </svg>
          </motion.div>
          <motion.b
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.3, duration: 0.35, ease: SPRING }}
          >
            {data.amount}
          </motion.b>
          <motion.span
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 0.9, y: 0 }}
            transition={{ delay: reduce ? 0 : 0.35, duration: 0.35, ease: SPRING }}
          >
            {data.text}
          </motion.span>
          <small>Toca para cerrar</small>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
