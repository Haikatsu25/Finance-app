"use client";

import { useEffect, useRef } from "react";
import { animate } from "framer-motion";

export type TabDirection = "l" | "r" | "up";

const SPRING: [number, number, number, number] = [0.22, 1.1, 0.3, 1];

/**
 * Una pestaña de la app. Todas siguen montadas (así no se pierde un formulario a medias ni la
 * conversación con la IA); la activa se muestra y sus bloques entran deslizando 40px desde el lado
 * que corresponde al orden de las pestañas (derecha si avanzas, izquierda si retrocedes),
 * 0.5s con resorte y 45ms de retraso por bloque (máx. 9). Con "reducir movimiento" no se anima.
 */
export function TabView({ active, direction, children }: {
  active: boolean;
  direction: TabDirection;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const skip = useRef(active); // la pestaña que ya está activa al cargar no se anima

  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    if (skip.current) { skip.current = false; return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const kids = Array.from(el.children) as HTMLElement[];
    const keyframes =
      direction === "up" ? { opacity: [0, 1], y: [18, 0], scale: [0.98, 1] }
      : { opacity: [0, 1], x: [direction === "l" ? 40 : -40, 0] };
    const controls = kids.map((k, i) =>
      animate(k, keyframes, { duration: direction === "up" ? 0.55 : 0.5, ease: SPRING, delay: Math.min(i, 9) * 0.045 }),
    );
    return () => controls.forEach((c) => c.stop());
    // Solo cuando la pestaña se activa; el contenido cambia a menudo y no debe repetir la entrada
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div ref={ref} className="view" hidden={!active}>
      {children}
    </div>
  );
}
