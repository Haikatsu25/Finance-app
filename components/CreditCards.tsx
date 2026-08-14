"use client";

import React, { useState } from "react";
import {
  Card, CardHeader, CardBody, Input, Button, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
} from "@heroui/react";
import {
  CreditCard as CreditCardIcon, Plus, Trash2, Calculator, AlertTriangle,
  Check, CalendarClock, Layers, ChevronDown, ChevronUp,
} from "lucide-react";
import { CreditCardItem, InstallmentPlan } from "@/types";
import { money, moneyExact, round2 } from "@/lib/format";
import {
  nextOccurrence, daysUntil, cardDebtBreakdown, totalDebtBreakdown, installmentStatus,
} from "@/lib/finance-utils";
import DebtSimulator from "./DebtSimulator";

// Gradientes tipo tarjeta física — se asignan cíclicamente
const CARD_SKINS = [
  "from-slate-800 via-slate-900 to-black",
  "from-indigo-900 via-slate-900 to-black",
  "from-emerald-900 via-slate-900 to-black",
  "from-rose-900 via-slate-900 to-black",
  "from-cyan-900 via-slate-900 to-black",
];

const TERMS = [3, 6, 9, 12, 18, 24];

function utilizationColor(pct: number): string {
  if (pct >= 80) return "bg-rose-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-emerald-500";
}

const fmtShort = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });

/** "hoy" · "mañana" · "en 4 días" · "hace 2 días" */
function whenText(days: number): string {
  if (days < 0) return `hace ${Math.abs(days)} ${Math.abs(days) === 1 ? "día" : "días"}`;
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  return `en ${days} días`;
}

function payBadge(days: number, date: Date): { text: string; cls: string } {
  const base = `Pagas ${fmtShort(date)} · ${whenText(days)}`;
  if (days < 0)  return { text: `Pago vencido ${whenText(days)}`, cls: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
  if (days === 0) return { text: `Pagas HOY (${fmtShort(date)})`, cls: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
  if (days <= 3) return { text: base, cls: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
  return { text: base, cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
}

function cutBadge(days: number, date: Date): { text: string; cls: string } {
  if (days === 0) return { text: `Corta HOY (${fmtShort(date)})`, cls: "bg-indigo-500/25 text-indigo-200 border-indigo-400/40" };
  return { text: `Corta ${fmtShort(date)} · ${whenText(days)}`, cls: "bg-white/10 text-white/60 border-white/15" };
}

// ─────────────────────────────────────────────────────────────────
// ACTUALIZAR DEUDA — formulario real con botón (antes solo Enter)
// ─────────────────────────────────────────────────────────────────
function BalanceUpdater({ current, onSave }: { current: number; onSave: (v: number) => void }) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);

  const parsed = parseFloat(value);
  const valid = value !== "" && Number.isFinite(parsed) && parsed >= 0;

  const commit = () => {
    if (!valid) return;
    onSave(round2(parsed));
    setValue("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <p className="text-[9px] font-bold uppercase tracking-wider text-white/40 mb-1.5">
        Reemplazar deuda de contado
      </p>
      <div className="flex items-center gap-1.5">
      <Input
        size="sm"
        variant="flat"
        type="number"
        min="0"
        inputMode="decimal"
        placeholder={`Saldo actual: ${current.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`}
        aria-label="Reemplazar deuda de contado"
        value={value}
        onValueChange={setValue}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
        startContent={<span className="text-white/40 text-xs font-bold">$</span>}
        classNames={{
          inputWrapper: "bg-white/10 hover:bg-white/15 data-[hover=true]:bg-white/15 h-9",
          input: "text-white placeholder:text-white/35 text-xs",
        }}
      />
      <Button
        isIconOnly
        size="sm"
        className={`h-9 min-w-9 shrink-0 font-bold ${
          saved ? "bg-emerald-500 text-white" : "bg-white text-black"
        }`}
        isDisabled={!valid && !saved}
        onPress={commit}
        aria-label="Guardar nueva deuda"
      >
        <Check size={16} />
      </Button>
      </div>
      <p className="text-[9px] text-white/30 mt-1">
        {saved ? "✓ Actualizado" : "Escribe el saldo que ves en tu app del banco"}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────
export default function CreditCards({
  cards, installments, onAdd, onRemove, onUpdateBalance, onAddInstallment, onRemoveInstallment,
}: {
  cards: CreditCardItem[];
  installments: InstallmentPlan[];
  onAdd: (card: Omit<CreditCardItem, "id">) => void;
  onRemove: (id: string) => void;
  onUpdateBalance: (id: string, balance: number) => void;
  onAddInstallment: (plan: Omit<InstallmentPlan, "id">) => void;
  onRemoveInstallment: (id: string) => void;
}) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isMsiOpen, onOpen: onMsiOpen, onOpenChange: onMsiChange } = useDisclosure();
  const [simCard, setSimCard] = useState<CreditCardItem | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<CreditCardItem | null>(null);

  // Alta de tarjeta
  const [label, setLabel] = useState("");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [cutoffDay, setCutoffDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [apr, setApr] = useState("");

  // Alta de compra a meses
  const [msiCardId, setMsiCardId] = useState("");
  const [msiLabel, setMsiLabel] = useState("");
  const [msiAmount, setMsiAmount] = useState("");
  const [msiMonths, setMsiMonths] = useState("12");
  const [msiDate, setMsiDate] = useState("");

  const validCard = label.trim() && creditLimit && dueDay &&
    Number.isFinite(parseFloat(creditLimit)) && parseFloat(creditLimit) > 0 &&
    parseInt(dueDay) >= 1 && parseInt(dueDay) <= 31;

  const validMsi = msiCardId && msiLabel.trim() && msiAmount &&
    Number.isFinite(parseFloat(msiAmount)) && parseFloat(msiAmount) > 0;

  const totals = totalDebtBreakdown(cards, installments);

  const submitCard = (close: () => void) => {
    if (!validCard) return;
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

  const submitMsi = (close: () => void) => {
    if (!validMsi) return;
    onAddInstallment({
      cardId: msiCardId,
      label: msiLabel.trim(),
      totalAmount: round2(parseFloat(msiAmount)),
      months: parseInt(msiMonths) || 12,
      startDate: msiDate || new Date().toISOString().split("T")[0],
    });
    setMsiLabel(""); setMsiAmount(""); setMsiDate("");
    close();
  };

  const openMsiModal = () => {
    if (!msiCardId && cards.length) setMsiCardId(cards[0].id);
    onMsiOpen();
  };

  return (
    <Card className="glass card-hover border border-cyan-500/20 col-span-1 sm:col-span-2 lg:col-span-3">
      <CardHeader className="flex justify-between items-start px-5 pt-5 pb-0 gap-2 flex-wrap">
        <div className="flex flex-col gap-1">
          <div className="p-2.5 rounded-xl bg-cyan-500/12 mb-2 w-fit">
            <CreditCardIcon size={18} className="text-cyan-500 dark:text-cyan-400" />
          </div>
          <h3 className="text-base font-bold tracking-tight">Tarjetas de Crédito</h3>
          <p className="text-xs text-default-400">Cortes, fechas límite, contado y meses sin intereses</p>
        </div>
        <div className="flex gap-2">
          {cards.length > 0 && (
            <Button size="sm" variant="flat" color="secondary" startContent={<Layers size={15} />} onPress={openMsiModal} className="font-bold">
              Compra a meses
            </Button>
          )}
          <Button size="sm" variant="flat" color="primary" startContent={<Plus size={15} />} onPress={onOpen} className="font-bold">
            Agregar tarjeta
          </Button>
        </div>
      </CardHeader>

      <CardBody className="px-5 py-4">
        {/* Resumen global contado vs meses */}
        {cards.length > 0 && (totals.totalOwed > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { label: "De contado", value: totals.cash, cls: "text-rose-500", hint: "a liquidar este corte" },
              { label: "A meses (saldo)", value: totals.installmentRemaining, cls: "text-indigo-500", hint: "pendiente total MSI" },
              { label: "Mensualidad MSI", value: totals.monthlyInstallment, cls: "text-amber-500", hint: "cargo de este mes" },
              { label: "Deuda total", value: totals.totalOwed, cls: "text-default-700", hint: "contado + meses" },
            ].map((s) => (
              <div key={s.label} className="p-3 rounded-xl bg-default-100/60 border border-default-200/50">
                <p className="text-[10px] font-bold uppercase tracking-wider text-default-400">{s.label}</p>
                <p className={`text-lg font-extrabold tnum ${s.cls}`}>{money(s.value)}</p>
                <p className="text-[9px] text-default-400">{s.hint}</p>
              </div>
            ))}
          </div>
        )}

        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-default-200/60 rounded-xl text-default-400 gap-1">
            <p className="text-xs font-medium">Sin tarjetas registradas</p>
            <p className="text-[11px] text-default-300">Agrega tu tarjeta para no volver a pagar intereses por olvido</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((c, i) => {
              const bd = cardDebtBreakdown(c, installments);
              const util = c.creditLimit > 0 ? Math.min(100, (bd.totalOwed / c.creditLimit) * 100) : 0;
              const due = nextOccurrence(c.dueDay);
              const daysLeft = daysUntil(due);
              const cut = nextOccurrence(c.cutoffDay);
              const cutDays = daysUntil(cut);
              const pay = payBadge(daysLeft, due);
              const cutB = cutBadge(cutDays, cut);
              const isExpanded = expanded === c.id;

              return (
                <div
                  key={c.id}
                  className={`group relative rounded-2xl p-4 text-white bg-gradient-to-br ${CARD_SKINS[i % CARD_SKINS.length]} border border-white/10 shadow-lg overflow-hidden animate-fade-in-scale`}
                >
                  <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-sm">{c.label}</p>
                      <p className="text-[10px] text-white/50 uppercase tracking-wider">
                        Corte día {c.cutoffDay} · Pago día {c.dueDay}
                      </p>
                    </div>
                    <button
                      onClick={() => setCardToDelete(c)}
                      className="shrink-0 p-2 -m-1 rounded-lg text-white/45 hover:text-rose-400 hover:bg-white/10 active:bg-white/15 transition-all"
                      aria-label={`Eliminar ${c.label}`}
                      title="Eliminar tarjeta"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Desglose contado / meses */}
                  <div className="flex items-end gap-3 mb-1">
                    <div>
                      <p className="text-[10px] text-white/50 uppercase tracking-widest">De contado</p>
                      <p className="text-2xl font-black tnum leading-tight">{money(bd.cash)}</p>
                    </div>
                    {bd.installmentRemaining > 0 && (
                      <div className="pb-0.5">
                        <p className="text-[10px] text-white/50 uppercase tracking-widest">A meses</p>
                        <p className="text-lg font-bold tnum text-indigo-300 leading-tight">{money(bd.installmentRemaining)}</p>
                      </div>
                    )}
                  </div>

                  {bd.monthlyInstallment > 0 && (
                    <p className="text-[11px] text-amber-300 mb-1 tnum">
                      + {money(bd.monthlyInstallment)}/mes de MSI · este corte pagas{" "}
                      <span className="font-bold">{money(bd.dueThisMonth)}</span>
                    </p>
                  )}

                  <p className="text-[11px] text-white/50 tnum mb-3">
                    Usado {money(bd.totalOwed)} de {money(c.creditLimit)} · {util.toFixed(0)}%
                  </p>

                  <div className="h-1.5 rounded-full bg-white/15 mb-3">
                    <div className={`h-full rounded-full ${utilizationColor(util)} transition-all duration-500`} style={{ width: `${util}%` }} />
                  </div>

                  {/* Fechas clave: corte y pago, cada una con su cuenta regresiva */}
                  <div className="flex gap-1.5 flex-wrap mb-2.5">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${pay.cls}`}>
                      {pay.text}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${cutB.cls}`}>
                      {cutB.text}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    <div className="flex gap-1.5">
                      {bd.activePlans.length > 0 && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : c.id)}
                          className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-indigo-200 bg-white/10 hover:bg-white/15 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Layers size={11} />
                          {bd.activePlans.length} MSI
                          {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                      )}
                      {bd.cash > 0 && (
                        <button
                          onClick={() => setSimCard(c)}
                          className="flex items-center gap-1 text-[10px] font-bold text-cyan-300 hover:text-cyan-200 bg-white/10 hover:bg-white/15 px-2 py-1 rounded-lg transition-colors"
                        >
                          <Calculator size={11} />
                          Simular
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lista de compras a meses */}
                  {isExpanded && bd.activePlans.length > 0 && (
                    <div className="mt-3 space-y-2 pt-3 border-t border-white/10 animate-fade-in-up">
                      {bd.activePlans.map((s) => (
                        <div key={s.plan.id} className="group/msi">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-bold text-white/90 truncate max-w-[110px]">{s.plan.label}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] tnum font-bold text-indigo-300">
                                {money(s.monthlyPayment)}<span className="text-white/40 font-normal">/mes</span>
                              </span>
                              <button
                                onClick={() => onRemoveInstallment(s.plan.id)}
                                className="p-1.5 -m-1 rounded-lg text-white/35 hover:text-rose-400 hover:bg-white/10 transition-all"
                                aria-label={`Eliminar compra a meses ${s.plan.label}`}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="h-1 rounded-full bg-white/15 mb-1">
                            <div className="h-full rounded-full bg-indigo-400 transition-all duration-500" style={{ width: `${s.progress}%` }} />
                          </div>
                          <p className="text-[10px] text-white/40 tnum">
                            {s.monthsPaid}/{s.plan.months} pagados · restan {money(s.remainingAmount)}
                            {s.nextChargeDate && ` · próximo ${s.nextChargeDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {bd.cash > 0 && daysLeft <= 3 && (
                    <p className="mt-2 text-[11px] text-amber-300 flex items-start gap-1">
                      <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                      Paga {money(bd.dueThisMonth)} antes del {due.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} para no generar intereses
                    </p>
                  )}

                  <BalanceUpdater current={bd.cash} onSave={(v) => onUpdateBalance(c.id, v)} />
                </div>
              );
            })}
          </div>
        )}
      </CardBody>

      {/* ── Modal: alta de tarjeta ─────────────────────────────── */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Nueva tarjeta de crédito</ModalHeader>
              <ModalBody>
                <Input label="Nombre" placeholder="Ej. BBVA Azul, Nu" variant="bordered" value={label} onValueChange={setLabel} />
                <div className="flex gap-2">
                  <Input label="Deuda de contado" type="number" min="0" inputMode="decimal" placeholder="0.00" variant="bordered"
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
                  Las compras a meses se agregan aparte, con el botón &quot;Compra a meses&quot;.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Cancelar</Button>
                <Button color="primary" variant="shadow" className="font-bold" isDisabled={!validCard} onPress={() => submitCard(onClose)}>
                  Guardar tarjeta
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Modal: compra a meses sin intereses ────────────────── */}
      <Modal isOpen={isMsiOpen} onOpenChange={onMsiChange} backdrop="blur">
        <ModalContent>
          {(onClose) => {
            const amt = parseFloat(msiAmount);
            const mths = parseInt(msiMonths) || 12;
            const monthly = Number.isFinite(amt) && amt > 0 ? amt / mths : 0;
            return (
              <>
                <ModalHeader className="flex items-center gap-2">
                  <Layers size={18} className="text-indigo-500" />
                  Compra a meses sin intereses
                </ModalHeader>
                <ModalBody>
                  <Select label="Tarjeta" variant="bordered" selectedKeys={msiCardId ? [msiCardId] : []}
                    onChange={(e) => setMsiCardId(e.target.value)}>
                    {cards.map((c) => <SelectItem key={c.id}>{c.label}</SelectItem>)}
                  </Select>
                  <Input label="¿Qué compraste?" placeholder="Ej. Laptop, Refrigerador" variant="bordered" value={msiLabel} onValueChange={setMsiLabel} />
                  <div className="flex gap-2">
                    <Input label="Monto total" type="number" min="0" inputMode="decimal" placeholder="0.00" variant="bordered"
                      startContent={<span className="text-default-400 text-xs">$</span>} value={msiAmount} onValueChange={setMsiAmount} className="flex-1" />
                    <Select label="Plazo" variant="bordered" className="w-32" selectedKeys={[msiMonths]}
                      onChange={(e) => setMsiMonths(e.target.value || "12")}>
                      {TERMS.map((t) => <SelectItem key={String(t)}>{`${t} meses`}</SelectItem>)}
                    </Select>
                  </div>
                  <Input label="Fecha de compra" type="date" variant="bordered" value={msiDate} onValueChange={setMsiDate}
                    description="Si la dejas vacía se usa hoy" />

                  {monthly > 0 && (
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center gap-3">
                      <CalendarClock size={18} className="text-indigo-500 shrink-0" />
                      <p className="text-sm text-default-600">
                        Pagarás <span className="font-black tnum text-indigo-500">{moneyExact(monthly)}</span> al mes durante{" "}
                        <span className="font-bold">{mths} meses</span>.
                      </p>
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>Cancelar</Button>
                  <Button color="secondary" variant="shadow" className="font-bold bg-indigo-500"
                    isDisabled={!validMsi} onPress={() => submitMsi(onClose)}>
                    Agregar a meses
                  </Button>
                </ModalFooter>
              </>
            );
          }}
        </ModalContent>
      </Modal>

      {/* ── Modal: confirmar eliminación de tarjeta ────────────── */}
      <Modal isOpen={cardToDelete !== null} onOpenChange={(o) => { if (!o) setCardToDelete(null); }} backdrop="blur" size="sm">
        <ModalContent>
          {(onClose) => {
            const plans = cardToDelete ? installments.filter((p) => p.cardId === cardToDelete.id) : [];
            return (
              <>
                <ModalHeader className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-rose-500" />
                  Eliminar tarjeta
                </ModalHeader>
                <ModalBody>
                  <p className="text-sm text-default-600">
                    ¿Seguro que quieres eliminar <span className="font-bold">{cardToDelete?.label}</span>?
                  </p>
                  {plans.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                      <p className="text-xs text-default-600">
                        También se eliminarán sus{" "}
                        <span className="font-bold">{plans.length} compra{plans.length > 1 ? "s" : ""} a meses</span>:
                      </p>
                      <ul className="mt-1.5 space-y-0.5">
                        {plans.map((p) => (
                          <li key={p.id} className="text-[11px] text-default-500 tnum">
                            · {p.label} — {money(p.totalAmount)} a {p.months} meses
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-[11px] text-default-400">
                    Podrás deshacerlo durante 5 segundos con el botón que aparecerá abajo.
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>Cancelar</Button>
                  <Button
                    color="danger" variant="shadow" className="font-bold"
                    startContent={<Trash2 size={15} />}
                    onPress={() => {
                      if (cardToDelete) onRemove(cardToDelete.id);
                      setCardToDelete(null);
                      onClose();
                    }}
                  >
                    Sí, eliminar
                  </Button>
                </ModalFooter>
              </>
            );
          }}
        </ModalContent>
      </Modal>

      <DebtSimulator card={simCard} onClose={() => setSimCard(null)} />
    </Card>
  );
}
