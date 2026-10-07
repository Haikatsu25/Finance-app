"use client";

import React, { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Sheet } from "./Sheet";

/**
 * Acciones de una fila (.it). En escritorio: botones Editar y Eliminar. En móvil (<900px) se
 * colapsan en un solo botón "⋯" de 44px que abre una hoja con Editar / Eliminar (el CSS decide
 * cuál se ve; el que está oculto no cuenta para lectores ni para el teclado).
 */
export function RowActions({ name, onEdit, onRemove }: {
  name: string;
  onEdit?: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="acts">
      {onEdit && (
        <button type="button" className="acts-d" onClick={onEdit} aria-label={`Editar ${name}`}>
          <Pencil size={15} aria-hidden />
        </button>
      )}
      <button type="button" className="acts-d" onClick={onRemove} aria-label={`Eliminar ${name}`}>
        <Trash2 size={15} aria-hidden />
      </button>
      <button type="button" className="acts-more" onClick={() => setOpen(true)} aria-label={`Acciones de ${name}`} aria-haspopup="dialog">
        <MoreHorizontal size={20} aria-hidden />
      </button>
      <Sheet open={open} onOpenChange={setOpen} title={name}>
        <div className="pk-list">
          {onEdit && (
            <button type="button" className="pk-opt" onClick={() => { setOpen(false); onEdit(); }}>
              <span>Editar</span><Pencil size={18} aria-hidden />
            </button>
          )}
          <button type="button" className="pk-opt danger" onClick={() => { setOpen(false); onRemove(); }}>
            <span>Eliminar</span><Trash2 size={18} aria-hidden />
          </button>
        </div>
      </Sheet>
    </div>
  );
}
