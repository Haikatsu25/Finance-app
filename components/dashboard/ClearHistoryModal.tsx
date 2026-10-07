"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { AlertTriangle } from "lucide-react";

export function ClearHistoryModal({ isOpen, onOpenChange, historyCount, onConfirm }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  historyCount: number;
  onConfirm: (close: () => void) => void;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur" size="sm">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-foreground" />
              Limpiar historial
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-default-500">
                Se eliminarán <span className="font-bold">{historyCount}</span> snapshots guardados.
                Esta acción no se puede deshacer.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>Cancelar</Button>
              <Button color="danger" variant="shadow" className="font-bold" onPress={() => onConfirm(onClose)}>
                Sí, limpiar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
