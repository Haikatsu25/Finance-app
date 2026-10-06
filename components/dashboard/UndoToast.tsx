"use client";

import React from "react";
import { Button } from "@heroui/react";
import { Undo2 } from "lucide-react";

export function UndoToast({ label, onUndo }: {
  label: string;
  onUndo: () => void;
}) {
  return (
    <div className="undo-toast" role="status">
      <span className="text-xs text-default-600 max-w-[180px] truncate">
        Se eliminó <span className="font-bold">{label}</span>
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
