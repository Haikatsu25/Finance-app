"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Button, Select, SelectItem } from "@heroui/react";
import { ArrowLeftRight } from "lucide-react";
import { FinanceItem } from "@/types";
import { money } from "@/lib/format";

export function TransferModal({
  isOpen, onOpenChange, onTransfer, assets,
  tFrom, setTFrom, tTo, setTTo, tAmount, setTAmount,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onTransfer: (close: () => void) => void;
  assets: FinanceItem[];
  tFrom: string;
  setTFrom: (v: string) => void;
  tTo: string;
  setTTo: (v: string) => void;
  tAmount: string;
  setTAmount: (v: string) => void;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur" size="sm">
      <ModalContent>
        {(onClose) => {
          const from = assets.find((a) => a.id === tFrom);
          const parsed = parseFloat(tAmount);
          const valid = tFrom && tTo && tFrom !== tTo && Number.isFinite(parsed) && parsed > 0 && from && parsed <= from.amount;
          return (
            <>
              <ModalHeader className="flex items-center gap-2">
                <ArrowLeftRight size={17} className="text-foreground" />
                Transferir entre cuentas
              </ModalHeader>
              <ModalBody>
                <Select label="De" variant="bordered" selectedKeys={tFrom ? [tFrom] : []}
                  onChange={(e) => setTFrom(e.target.value)}>
                  {assets.map((a) => (
                    <SelectItem key={a.id} textValue={a.label}>{`${a.label} — ${money(a.amount)}`}</SelectItem>
                  ))}
                </Select>
                <Select label="Hacia" variant="bordered" selectedKeys={tTo ? [tTo] : []}
                  onChange={(e) => setTTo(e.target.value)}>
                  {assets.filter((a) => a.id !== tFrom).map((a) => (
                    <SelectItem key={a.id} textValue={a.label}>{`${a.label} — ${money(a.amount)}`}</SelectItem>
                  ))}
                </Select>
                <Input label="Monto" type="number" min="0" step="0.01" inputMode="decimal" variant="bordered"
                  startContent={<span className="text-default-400 text-xs">$</span>}
                  value={tAmount} onValueChange={setTAmount} />
                {from && Number.isFinite(parsed) && parsed > from.amount && (
                  <p className="text-[11px] text-money-out-text font-semibold">
                    {from.label} solo tiene {money(from.amount)}.
                  </p>
                )}
                <p className="text-[11px] text-default-400">
                  Mueve el saldo entre tus cuentas — no cuenta como gasto ni ingreso.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="primary" variant="shadow" className="font-bold" isDisabled={!valid}
                  startContent={<ArrowLeftRight size={15} />} onPress={() => onTransfer(onClose)}>
                  Transferir
                </Button>
              </ModalFooter>
            </>
          );
        }}
      </ModalContent>
    </Modal>
  );
}
