"use client";

import { Sparkles } from "lucide-react";

export function DemoDataBanner({ onClear }: { onClear: () => void }) {
  return (
    <div className="demo-banner wide">
      <Sparkles size={16} className="shrink-0" aria-hidden />
      <p className="flex-1">
        Estás explorando con <b>datos de ejemplo</b>. Juega con todo: nada es real.
      </p>
      <button type="button" className="btn sm shrink-0" onClick={onClear}>
        Borrar ejemplo y empezar
      </button>
    </div>
  );
}
