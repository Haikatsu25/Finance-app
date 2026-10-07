"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { RefreshCw } from "lucide-react";

export function SyncConflictModal({ isOpen, onResolve }: {
  isOpen: boolean;
  onResolve: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={() => {}} backdrop="blur" size="sm" hideCloseButton isDismissable={false}>
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <RefreshCw size={18} className="text-foreground" />
          Datos actualizados en otro lugar
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-500">
            Guardaste cambios desde otro dispositivo o pestaña. Para no perder nada,
            cargaremos la versión más reciente.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" variant="shadow" className="font-bold w-full" onPress={onResolve}>
            Cargar datos más recientes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
