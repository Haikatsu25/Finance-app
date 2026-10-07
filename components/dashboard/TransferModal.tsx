"use client";

import { ArrowLeftRight } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { celebrate, originOf } from "@/components/ui/SuccessReveal";
import { FinanceItem } from "@/types";
import { money } from "@/lib/format";
import { Picker } from "../ui/Picker";

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
  const close = () => onOpenChange(false);
  const from = assets.find((a) => a.id === tFrom);
  const to = assets.find((a) => a.id === tTo);
  const parsed = parseFloat(tAmount);
  const tooMuch = !!from && Number.isFinite(parsed) && parsed > from.amount;
  const valid = !!tFrom && !!tTo && tFrom !== tTo && Number.isFinite(parsed) && parsed > 0 && !!from && parsed <= from.amount;

  const confirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!valid || !from || !to) return;
    const origin = originOf(e.currentTarget);
    onTransfer(close);
    celebrate({ amount: money(parsed), text: `De ${from.label} a ${to.label}`, tone: "transfer", ...origin });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange} title="Transferir entre cuentas">
      <div className="f">
        <label htmlFor="tr-from">De</label>
        <Picker id="tr-from" variant="field" label="De" value={tFrom} onChange={setTFrom} placeholder="Elige una cuenta"
          options={assets.map((a) => ({ value: a.id, label: `${a.label}, ${money(a.amount)}` }))} />
      </div>
      <div className="f">
        <label htmlFor="tr-to">Hacia</label>
        <Picker id="tr-to" variant="field" label="Hacia" value={tTo} onChange={setTTo} placeholder="Elige una cuenta"
          options={assets.filter((a) => a.id !== tFrom).map((a) => ({ value: a.id, label: `${a.label}, ${money(a.amount)}` }))} />
      </div>
      <div className="f">
        <label htmlFor="tr-amount">Monto</label>
        <input
          id="tr-amount" type="number" min="0" step="0.01" inputMode="decimal" placeholder="$ 0.00"
          value={tAmount} onChange={(e) => setTAmount(e.target.value)}
          className={tooMuch ? "err" : ""} aria-invalid={tooMuch}
        />
        {tooMuch && from && <p className="err-msg" role="alert">{from.label} solo tiene {money(from.amount)}.</p>}
      </div>
      <p className="callout">Mueve el saldo entre tus cuentas; no cuenta como gasto ni ingreso.</p>
      <div className="ft">
        <button type="button" className="btn soft" onClick={close}>Cancelar</button>
        <button type="button" className="btn" disabled={!valid} onClick={confirm}>
          <ArrowLeftRight size={16} aria-hidden /> Transferir
        </button>
      </div>
    </Sheet>
  );
}
