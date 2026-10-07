"use client";

import { Upload } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";

export function ImportModal({ isOpen, onOpenChange, importError, importPreview, onConfirm }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  importError: string | null;
  importPreview: { data: any; counts: string } | null;
  onConfirm: (close: () => void) => void;
}) {
  const close = () => onOpenChange(false);
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange} title={importError ? "Archivo inválido" : "Importar respaldo"}>
      {importError ? (
        <p className="callout warn">{importError}</p>
      ) : (
        <>
          <p className="callout">
            El respaldo contiene: <b>{importPreview?.counts}</b>
          </p>
          <p className="callout warn font-semibold">Esto reemplazará todos tus datos actuales.</p>
        </>
      )}
      <div className="ft">
        <button type="button" className="btn soft" onClick={close}>{importError ? "Entendido" : "Cancelar"}</button>
        {!importError && (
          <button type="button" className="btn" onClick={() => onConfirm(close)}>
            <Upload size={16} aria-hidden /> Sí, importar
          </button>
        )}
      </div>
    </Sheet>
  );
}
