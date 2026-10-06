"use client";

import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, Select, SelectItem } from "@heroui/react";
import { Plus } from "lucide-react";
import { QUICK_CATEGORIES, type QuickAddType } from "./quickAdd";

export function QuickAddModal({
  isOpen, onOpenChange, onSubmit,
  quickType, setQuickType, quickLabel, setQuickLabel,
  quickAmount, setQuickAmount, quickCategory, setQuickCategory, quickAmountValid,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (close: () => void) => void;
  quickType: QuickAddType;
  setQuickType: (t: QuickAddType) => void;
  quickLabel: string;
  setQuickLabel: (v: string) => void;
  quickAmount: string;
  setQuickAmount: (v: string) => void;
  quickCategory: string;
  setQuickCategory: (v: string) => void;
  quickAmountValid: boolean;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="bottom-center" backdrop="blur">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">Registro rápido</ModalHeader>
            <ModalBody className="pb-2">
              <div className="flex gap-2">
                {([
                  { id: "asset",     label: "Activo",   cls: "bg-emerald-500" },
                  { id: "liability", label: "Gasto",    cls: "bg-rose-500" },
                  { id: "bucket",    label: "Apartado", cls: "bg-amber-500" },
                ] as { id: QuickAddType; label: string; cls: string }[]).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setQuickType(opt.id);
                      setQuickCategory(QUICK_CATEGORIES[opt.id][0]);
                    }}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                      quickType === opt.id
                        ? `${opt.cls} text-white shadow-md`
                        : "bg-default-100 text-default-500 hover:bg-default-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <Input
                autoFocus
                placeholder="Descripción"
                variant="bordered"
                value={quickLabel}
                onValueChange={setQuickLabel}
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0.00"
                  variant="bordered"
                  startContent={<span className="text-default-400 text-sm font-bold">$</span>}
                  className="flex-1"
                  value={quickAmount}
                  onValueChange={setQuickAmount}
                />
                <Select
                  variant="bordered"
                  aria-label="Categoría"
                  className="w-[150px]"
                  selectedKeys={[quickCategory]}
                  onChange={(e) => setQuickCategory(e.target.value || QUICK_CATEGORIES[quickType][0])}
                >
                  {QUICK_CATEGORIES[quickType].map((cat) => (
                    <SelectItem key={cat}>{cat}</SelectItem>
                  ))}
                </Select>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>Cancelar</Button>
              <Button
                color="primary"
                variant="shadow"
                className="font-bold"
                isDisabled={!quickLabel.trim() || !quickAmountValid}
                onPress={() => onSubmit(onClose)}
                startContent={<Plus size={16} />}
              >
                Agregar
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
