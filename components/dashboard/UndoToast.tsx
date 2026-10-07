"use client";

import { Undo2 } from "lucide-react";

export function UndoToast({ label, message, onUndo }: {
  label: string;
  /** Texto completo; si no viene, se dice "Se eliminó {label}" (borrados) */
  message?: string;
  onUndo: () => void;
}) {
  return (
    <div className="undo-toast" role="status">
      <span className={`min-w-0 flex-1 ${message ? "leading-snug line-clamp-2" : "truncate"}`}>
        {message ?? <>Se eliminó <b>{label}</b></>}
      </span>
      <button
        type="button"
        onClick={onUndo}
        className="min-h-11 shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 font-extrabold"
      >
        <Undo2 size={14} aria-hidden /> Deshacer
      </button>
    </div>
  );
}
