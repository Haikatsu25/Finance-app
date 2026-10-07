"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { AlertTriangle, Upload } from "lucide-react";

export function ImportModal({ isOpen, onOpenChange, importError, importPreview, onConfirm }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  importError: string | null;
  importPreview: { data: any; counts: string } | null;
  onConfirm: (close: () => void) => void;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur" size="sm">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2">
              {importError
                ? <><AlertTriangle size={18} className="text-money-out-text" /> Archivo inválido</>
                : <><Upload size={18} className="text-foreground" /> Importar respaldo</>}
            </ModalHeader>
            <ModalBody>
              {importError ? (
                <p className="text-sm text-default-500">{importError}</p>
              ) : (
                <>
                  <p className="text-sm text-default-500">
                    El respaldo contiene: <span className="font-semibold text-default-700">{importPreview?.counts}</span>
                  </p>
                  <p className="text-sm text-money-out-text font-semibold">
                    Esto reemplazará todos tus datos actuales.
                  </p>
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>{importError ? "Entendido" : "Cancelar"}</Button>
              {!importError && (
                <Button color="secondary" variant="shadow" className="font-bold" onPress={() => onConfirm(onClose)}>
                  Sí, importar
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
