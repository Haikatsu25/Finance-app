"use client";

import { Button } from "@heroui/react";
import { Undo2 } from "lucide-react";

export function UndoToast({ label, message, onUndo }: {
  label: string;
  /** Texto completo; si no viene, se dice "Se eliminó {label}" (borrados) */
  message?: string;
  onUndo: () => void;
}) {
  return (
    <div className="undo-toast" role="status">
      <span className={`min-w-0 text-xs text-default-600 ${message ? "leading-snug line-clamp-2" : "truncate"}`}>
        {message ?? <>Se eliminó <span className="font-bold">{label}</span></>}
      </span>
      <Button
        variant="flat"
        color="primary"
        className="font-bold h-11 min-w-11 shrink-0"
        startContent={<Undo2 size={14} />}
        onPress={onUndo}
      >
        Deshacer
      </Button>
    </div>
  );
}
