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
      <span className={`text-xs text-default-600 ${message ? "max-w-[230px] leading-snug line-clamp-2" : "max-w-[180px] truncate"}`}>
        {message ?? <>Se eliminó <span className="font-bold">{label}</span></>}
      </span>
      <Button
        size="sm"
        variant="flat"
        color="primary"
        className="font-bold"
        startContent={<Undo2 size={14} />}
        onPress={onUndo}
      >
        Deshacer
      </Button>
    </div>
  );
}
