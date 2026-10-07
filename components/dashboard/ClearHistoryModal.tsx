"use client";

import { TriangleAlert } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";

export function ClearHistoryModal({ isOpen, onOpenChange, historyCount, onConfirm }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  historyCount: number;
  onConfirm: (close: () => void) => void;
}) {
  const close = () => onOpenChange(false);
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange} title="Limpiar historial">
      <div className="callout warn flex items-start gap-2">
        <TriangleAlert size={16} className="shrink-0 mt-0.5" aria-hidden />
        <p>
          Se eliminarán <b>{historyCount}</b> snapshots guardados. Esta acción no se puede deshacer.
        </p>
      </div>
      <div className="ft">
        <button type="button" className="btn soft" onClick={close}>Cancelar</button>
        <button type="button" className="btn danger" onClick={() => onConfirm(close)}>Sí, limpiar</button>
      </div>
    </Sheet>
  );
}
