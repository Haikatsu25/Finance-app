"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, Select, SelectItem } from "@heroui/react";
import { Pencil, Check } from "lucide-react";
import { FinanceItem } from "@/types";
import { QUICK_CATEGORIES, type EditKind } from "./quickAdd";

export function EditModal({
  editTarget, setEditTarget, liabilities, onSave,
  eLabel, setELabel, eAmount, setEAmount, eDate, setEDate, eCategory, setECategory,
  eCycle, setECycle, eTarget, setETarget, eCurrent, setECurrent, eDeadline, setEDeadline,
}: {
  editTarget: { kind: EditKind; id: string } | null;
  setEditTarget: (target: { kind: EditKind; id: string } | null) => void;
  liabilities: FinanceItem[];
  onSave: () => void;
  eLabel: string;
  setELabel: (v: string) => void;
  eAmount: string;
  setEAmount: (v: string) => void;
  eDate: string;
  setEDate: (v: string) => void;
  eCategory: string;
  setECategory: (v: string) => void;
  eCycle: "mensual" | "anual";
  setECycle: (v: "mensual" | "anual") => void;
  eTarget: string;
  setETarget: (v: string) => void;
  eCurrent: string;
  setECurrent: (v: string) => void;
  eDeadline: string;
  setEDeadline: (v: string) => void;
}) {
  return (
    <Modal isOpen={editTarget !== null} onOpenChange={(o) => { if (!o) setEditTarget(null); }} backdrop="blur">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2">
              <Pencil size={17} className="text-foreground" />
              Editar registro
            </ModalHeader>
            <ModalBody>
              <Input label="Descripción" variant="bordered" value={eLabel} onValueChange={setELabel} />

              {(editTarget?.kind === "asset" || editTarget?.kind === "liability" || editTarget?.kind === "bucket") && (
                <>
                  <div className="flex gap-2">
                    <Input label="Monto" type="number" min="0" step="0.01" inputMode="decimal" variant="bordered"
                      startContent={<span className="text-default-400 text-xs">$</span>}
                      value={eAmount} onValueChange={setEAmount} className="flex-1" />
                    <Input label="Fecha" type="date" variant="bordered" value={eDate} onValueChange={setEDate} className="w-[160px]" />
                  </div>
                  <Select label="Categoría" variant="bordered"
                    selectedKeys={eCategory ? [eCategory] : []}
                    onChange={(e) => setECategory(e.target.value)}>
                    {QUICK_CATEGORIES[editTarget.kind].map((c) => <SelectItem key={c}>{c}</SelectItem>)}
                  </Select>
                  {editTarget.kind === "liability" &&
                    liabilities.find((l) => l.id === editTarget.id)?.cardId && (
                    <p className="text-[11px] text-default-600">
                      Este gasto está ligado a una tarjeta: al cambiar el monto, la deuda de la tarjeta se ajusta por la diferencia.
                    </p>
                  )}
                </>
              )}

              {editTarget?.kind === "sub" && (
                <div className="flex gap-2">
                  <Input label="Monto" type="number" min="0" step="0.01" inputMode="decimal" variant="bordered"
                    startContent={<span className="text-default-400 text-xs">$</span>}
                    value={eAmount} onValueChange={setEAmount} className="flex-1" />
                  <Select label="Ciclo" variant="bordered" className="w-[140px]"
                    selectedKeys={[eCycle]}
                    onChange={(e) => { const v = e.target.value; if (v === "mensual" || v === "anual") setECycle(v); }}>
                    <SelectItem key="mensual">Mensual</SelectItem>
                    <SelectItem key="anual">Anual</SelectItem>
                  </Select>
                </div>
              )}

              {editTarget?.kind === "goal" && (
                <>
                  <div className="flex gap-2">
                    <Input label="Monto meta" type="number" min="0" step="0.01" inputMode="decimal" variant="bordered"
                      startContent={<span className="text-default-400 text-xs">$</span>}
                      value={eTarget} onValueChange={setETarget} className="flex-1" />
                    <Input label="Llevo ahorrado" type="number" min="0" step="0.01" inputMode="decimal" variant="bordered"
                      startContent={<span className="text-default-400 text-xs">$</span>}
                      value={eCurrent} onValueChange={setECurrent} className="flex-1" />
                  </div>
                  <Input label="Fecha límite" type="date" variant="bordered" value={eDeadline} onValueChange={setEDeadline} />
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>Cancelar</Button>
              <Button color="primary" variant="shadow" className="font-bold"
                startContent={<Check size={15} />}
                onPress={() => { onSave(); onClose(); }}>
                Guardar cambios
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
