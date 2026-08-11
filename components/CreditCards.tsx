"use client";

import React, { useState } from "react";
import {
  Card, CardHeader, CardBody, Input, Button,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
} from "@heroui/react";
import { CreditCard as CreditCardIcon, Plus, Trash2, Calculator, AlertTriangle } from "lucide-react";
import { CreditCardItem } from "@/types";
import { money, moneyExact, round2 } from "@/lib/format";
import { nextOccurrence, daysUntil } from "@/lib/finance-utils";
import DebtSimulator from "./DebtSimulator";

// Gradientes tipo tarjeta física — se asignan cíclicamente
const CARD_SKINS = [
  "from-slate-800 via-slate-900 to-black",
  "from-indigo-900 via-slate-900 to-black",
  "from-emerald-900 via-slate-900 to-black",
  "from-rose-900 via-slate-900 to-black",
  "from-cyan-900 via-slate-900 to-black",
];

function utilizationColor(pct: number): string {
  if (pct >= 80) return "bg-rose-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-emerald-500";
}

function dueBadge(daysLeft: number): { text: string; cls: string } {
  if (daysLeft < 0)  return { text: `Vencida hace ${Math.abs(daysLeft)}d`, cls: "bg-rose-500/20 text-rose-400 border-rose-500/40" };
  if (daysLeft === 0) return { text: "Vence HOY", cls: "bg-rose-500/20 text-rose-400 border-rose-500/40" };
  if (daysLeft <= 3) return { text: `Vence en ${daysLeft}d`, cls: "bg-amber-500/20 text-amber-400 border-amber-500/40" };
  return { text: `Vence en ${daysLeft}d`, cls: "bg-white/10 text-white/70 border-white/20" };
}

export default function CreditCards({ cards, onAdd, onRemove, onUpdateBalance }: {
  cards: CreditCardItem[];
  onAdd: (card: Omit<CreditCardItem, "id">) => void;
  onRemove: (id: string) => void;
  onUpdateBalance: (id: string, balance: number) => void;
}) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [simCard, setSimCard] = useState<CreditCardItem | null>(null);

  // Formulario de alta
  const [label, setLabel] = useState("");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [cutoffDay, setCutoffDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [apr, setApr] = useState("");

  const valid = label.trim() && creditLimit && dueDay &&
    Number.isFinite(parseFloat(creditLimit)) && parseFloat(creditLimit) > 0 &&
    parseInt(dueDay) >= 1 && parseInt(dueDay) <= 31;

  const submit = (close: () => void) => {
    if (!valid) return;
    onAdd({
      label: label.trim(),
      balance: round2(parseFloat(balance) || 0),
      creditLimit: round2(parseFloat(creditLimit)),
      cutoffDay: Math.min(31, Math.max(1, parseInt(cutoffDay) || 1)),
      dueDay: Math.min(31, Math.max(1, parseInt(dueDay))),
      apr: round2(parseFloat(apr) || 0),
      minPayment: 0,
    });
    setLabel(""); setBalance(""); setCreditLimit(""); setCutoffDay(""); setDueDay(""); setApr("");
    close();
  };

  return (
    <Card className="glass card-hover border border-cyan-500/20 col-span-1 sm:col-span-2 lg:col-span-3">
      <CardHeader className="flex justify-between items-start px-5 pt-5 pb-0">
        <div className="flex flex-col gap-1">
          <div className="p-2.5 rounded-xl bg-cyan-500/12 mb-2 w-fit">
            <CreditCardIcon size={18} className="text-cyan-500 dark:text-cyan-400" />
          </div>
          <h3 className="text-base font-bold tracking-tight">Tarjetas de Crédito</h3>
          <p className="text-xs text-default-400">Cortes, fechas límite y utilización</p>
        </div>
        <Button size="sm" variant="flat" color="primary" startContent={<Plus size={15} />} onPress={onOpen} className="font-bold">
          Agregar tarjeta
        </Button>
      </CardHeader>

      <CardBody className="px-5 py-4">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-default-200/60 rounded-xl text-default-400 gap-1">
            <p className="text-xs font-medium">Sin tarjetas registradas</p>
            <p className="text-[11px] text-default-300">Agrega tu tarjeta para no volver a pagar intereses por olvido</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((c, i) => {
              const util = c.creditLimit > 0 ? Math.min(100, (c.balance / c.creditLimit) * 100) : 0;
              const due = nextOccurrence(c.dueDay);
              const daysLeft = daysUntil(due);
              const badge = dueBadge(daysLeft);
              return (
                <div
                  key={c.id}
                  className={`group relative rounded-2xl p-4 text-white bg-gradient-to-br ${CARD_SKINS[i % CARD_SKINS.length]} border border-white/10 shadow-lg overflow-hidden animate-fade-in-scale`}
                >
                  {/* brillo de canto */}
                  <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-sm">{c.label}</p>
                      <p className="text-[10px] text-white/50 uppercase tracking-wider">
                        Corte día {c.cutoffDay} · Límite pago día {c.dueDay}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemove(c.id)}
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-white/40 hover:text-rose-400 transition-all p-1"
                      aria-label={`Eliminar ${c.label}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <p className="text-[10px] text-white/50 uppercase tracking-widest">Deuda actual</p>
                  <p className="text-2xl font-black tnum mb-1">{money(c.balance)}</p>
                  <p className="text-[11px] text-white/50 tnum mb-3">
                    de {money(c.creditLimit)} · {util.toFixed(0)}% usado
                  </p>

                  <div className="h-1.5 rounded-full bg-white/15 mb-3">
                    <div className={`h-full rounded-full ${utilizationColor(util)} transition-all duration-500`} style={{ width: `${util}%` }} />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${badge.cls}`}>
                      {badge.text}
                    </span>
                    {c.balance > 0 && (
                      <button
                        onClick={() => setSimCard(c)}
                        className="flex items-center gap-1 text-[10px] font-bold text-cyan-300 hover:text-cyan-200 bg-white/10 hover:bg-white/15 px-2 py-1 rounded-lg transition-colors"
                      >
                        <Calculator size={11} />
                        Simular pago
                      </button>
                    )}
                  </div>

                  {c.balance > 0 && daysLeft <= 3 && (
                    <p className="mt-2 text-[11px] text-amber-300 flex items-center gap-1">
                      <AlertTriangle size={11} className="shrink-0" />
                      Paga {money(c.balance)} antes del {due.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} para no generar intereses
                    </p>
                  )}

                  <div className="mt-3 flex items-center gap-1.5">
                    <Input
                      size="sm"
                      variant="flat"
                      placeholder="Actualizar deuda $"
                      aria-label={`Actualizar deuda de ${c.label}`}
                      type="number"
                      min="0"
                      inputMode="decimal"
                      classNames={{ inputWrapper: "bg-white/10 hover:bg-white/15 h-8", input: "text-white placeholder:text-white/40 text-xs" }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const el = e.target as HTMLInputElement;
                          const val = parseFloat(el.value);
                          if (Number.isFinite(val) && val >= 0) onUpdateBalance(c.id, round2(val));
                          el.value = "";
                        }
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>

      {/* Modal alta de tarjeta */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Nueva tarjeta de crédito</ModalHeader>
              <ModalBody>
                <Input label="Nombre" placeholder="Ej. BBVA Azul, Nu" variant="bordered" value={label} onValueChange={setLabel} />
                <div className="flex gap-2">
                  <Input label="Deuda actual" type="number" min="0" inputMode="decimal" placeholder="0.00" variant="bordered"
                    startContent={<span className="text-default-400 text-xs">$</span>} value={balance} onValueChange={setBalance} />
                  <Input label="Límite de crédito" type="number" min="0" inputMode="decimal" placeholder="0.00" variant="bordered"
                    startContent={<span className="text-default-400 text-xs">$</span>} value={creditLimit} onValueChange={setCreditLimit} />
                </div>
                <div className="flex gap-2">
                  <Input label="Día de corte" type="number" min="1" max="31" placeholder="15" variant="bordered" value={cutoffDay} onValueChange={setCutoffDay} />
                  <Input label="Día límite de pago" type="number" min="1" max="31" placeholder="5" variant="bordered" value={dueDay} onValueChange={setDueDay} />
                  <Input label="Tasa anual %" type="number" min="0" placeholder="60" variant="bordered" value={apr} onValueChange={setApr} />
                </div>
                <p className="text-[11px] text-default-400">
                  La tasa anual (CAT aproximado) solo se usa para el simulador de pagos.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="primary" variant="shadow" className="font-bold" isDisabled={!valid} onPress={() => submit(onClose)}>
                  Guardar tarjeta
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Simulador */}
      <DebtSimulator card={simCard} onClose={() => setSimCard(null)} />
    </Card>
  );
}
