"use client";

import { RefreshCw } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";

export function SyncConflictModal({ isOpen, onResolve }: {
  isOpen: boolean;
  onResolve: () => void;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={() => {}} title="Datos actualizados en otro lugar" dismissable={false} hideClose>
      <p className="callout">
        Guardaste cambios desde otro dispositivo o pestaña. Para no perder nada, cargaremos la versión más reciente.
      </p>
      <div className="ft">
        <button type="button" className="btn w-full" onClick={onResolve}>
          <RefreshCw size={16} aria-hidden /> Cargar datos más recientes
        </button>
      </div>
    </Sheet>
  );
}
