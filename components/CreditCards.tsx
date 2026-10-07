"use client";

import { useState } from "react";
import {
  Input, Button, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
} from "@heroui/react";
import {
  CreditCard as CreditCardIcon, Plus, Trash2, Calculator, AlertTriangle,
  Check, CalendarClock, Layers, ChevronDown, ChevronUp, BadgeCheck, Pencil, Minus, Scissors,
} from "lucide-react";
import { CreditCardItem, InstallmentPlan, FinanceItem } from "@/types";
import { money, moneyExact, round2 } from "@/lib/format";
import {
  nextOccurrence, paymentDueDate, statementDueDate, daysUntil, cardDebtBreakdown, totalDebtBreakdown, installmentStatus, todayIso, isoDate } from "@/lib/finance-utils";
import DebtSimulator from "./DebtSimulator";
import AddedByBadge from "./AddedByBadge";

const TERMS = [3, 6, 9, 12, 18, 24];

const fmtShort = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });

/** "hoy", "mañana", "en 4 días", "hace 2 días" */
function whenText(days: number): string {
  if (days < 0) return `hace ${Math.abs(days)} ${Math.abs(days) === 1 ? "día" : "días"}`;
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  return `en ${days} días`;
}

/** Estado del pago: "late" va en el chip rojo; el resto, en el chip neutro */
type PayLevel = "late" | "soon" | "calm";

function payInfo(days: number, date: Date): { text: string; level: PayLevel } {
  if (days < 0) return { text: `Pago vencido ${whenText(days)}`, level: "late" };
  if (days === 0) return { text: `Pagas hoy (${fmtShort(date)})`, level: "late" };
  const text = `Pagas el ${fmtShort(date)}, ${whenText(days)}`;
  return { text, level: days <= 3 ? "soon" : "calm" };
}

function cutText(days: number, date: Date): string {
  return days === 0 ? `Corta hoy (${fmtShort(date)})` : `Corta el ${fmtShort(date)}, ${whenText(days)}`;
}

const FACE_ICON_BTN = "size-11 grid place-items-center rounded-full text-(--face-muted) transition-colors hover:bg-white/10 hover:text-(--face-fg)";

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
    <div className="mt-auto pt-4">
      <div className="pt-4 border-t border-(--face-line)">
        <p className="text-xs font-semibold text-(--face-muted) mb-2">Reemplazar deuda de contado</p>
        <div className="flex items-center gap-2">
          <input
            type="number" min="0" inputMode="decimal"
            className="h-11 min-w-0 flex-1 rounded-full bg-white/10 px-4 text-sm text-(--face-fg) placeholder:text-(--face-muted)"
            placeholder={`Saldo actual: ${current.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`}
            aria-label="Reemplazar deuda de contado"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
          />
          <button
            type="button"
            className="size-11 shrink-0 grid place-items-center rounded-full bg-white text-(--navy) disabled:opacity-40"
            disabled={!valid && !saved}
            onClick={commit}
            aria-label="Guardar nueva deuda"
          >
            <Check size={18} aria-hidden />
          </button>
        </div>
        <p className="text-xs text-(--face-muted) mt-1.5" aria-live="polite">
          {saved ? "Actualizado" : "Escribe el saldo que ves en tu app del banco"}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────
export default function CreditCards({
  cards, installments, liabilities = [], onAdd, onRemove, onUpdateBalance, onAddInstallment, onRemoveInstallment, onMarkPaid, viewerId, onUpdateCard, onUpdateInstallment,
}: {
  cards: CreditCardItem[];
  installments: InstallmentPlan[];
  liabilities?: FinanceItem[];
  onAdd: (card: Omit<CreditCardItem, "id">) => void;
  onRemove: (id: string) => void;
  onUpdateBalance: (id: string, balance: number) => void;
  onAddInstallment: (plan: Omit<InstallmentPlan, "id">) => void;
  onRemoveInstallment: (id: string) => void;
  onMarkPaid?: (id: string) => void;
  viewerId?: string;
  onUpdateCard?: (id: string, patch: Partial<CreditCardItem>) => void;
  onUpdateInstallment?: (id: string, patch: Partial<InstallmentPlan>) => void;
}) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isMsiOpen, onOpen: onMsiOpen, onOpenChange: onMsiChange } = useDisclosure();
  const [simCard, setSimCard] = useState<CreditCardItem | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cardToDelete, setCardToDelete] = useState<CreditCardItem | null>(null);
  const [cardToPay, setCardToPay] = useState<CreditCardItem | null>(null);
  const [editingCard, setEditingCard] = useState<CreditCardItem | null>(null);
  const [editingPlan, setEditingPlan] = useState<InstallmentPlan | null>(null);

  // Alta de tarjeta
  const [label, setLabel] = useState("");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [cutoffDay, setCutoffDay] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [apr, setApr] = useState("");
  const [last4, setLast4] = useState("");

  // Alta de compra a meses
  const [msiCardId, setMsiCardId] = useState("");
  const [msiLabel, setMsiLabel] = useState("");
  const [msiAmount, setMsiAmount] = useState("");
  const [msiMonths, setMsiMonths] = useState("12");
  const [msiDate, setMsiDate] = useState("");
  const [msiPaid, setMsiPaid] = useState("");   // mensualidades ya pagadas (absoluto, solo al editar)

  const validCard = label.trim() && creditLimit && dueDay &&
    Number.isFinite(parseFloat(creditLimit)) && parseFloat(creditLimit) > 0 &&
    parseInt(dueDay) >= 1 && parseInt(dueDay) <= 31 &&
    (last4 === "" || /^\d{4}$/.test(last4));

  const validMsi = msiCardId && msiLabel.trim() && msiAmount &&
    Number.isFinite(parseFloat(msiAmount)) && parseFloat(msiAmount) > 0;

  const totals = totalDebtBreakdown(cards, installments);

  const openEditCard = (c: CreditCardItem) => {
    setLabel(c.label);
    setBalance("");
    setCreditLimit(String(c.creditLimit));
    setCutoffDay(String(c.cutoffDay));
    setDueDay(String(c.dueDay));
    setApr(c.apr ? String(c.apr) : "");
    setLast4(c.last4 || "");
    setEditingCard(c);
    onOpen();
  };

  const openEditMsi = (p: InstallmentPlan) => {
    setMsiCardId(p.cardId);
    setMsiLabel(p.label);
    setMsiAmount(String(p.totalAmount));
    setMsiMonths(String(p.months));
    setMsiDate(p.startDate);
    setMsiPaid(String(installmentStatus(p).monthsPaid));
    setEditingPlan(p);
    onMsiOpen();
  };

  const submitCard = (close: () => void) => {
    if (!validCard) return;
    if (editingCard && onUpdateCard) {
      onUpdateCard(editingCard.id, {
        label: label.trim(),
        creditLimit: round2(parseFloat(creditLimit)),
        cutoffDay: Math.min(31, Math.max(1, parseInt(cutoffDay) || 1)),
        dueDay: Math.min(31, Math.max(1, parseInt(dueDay))),
        apr: round2(parseFloat(apr) || 0),
        last4,
      });
      setEditingCard(null);
      setLabel(""); setBalance(""); setCreditLimit(""); setCutoffDay(""); setDueDay(""); setApr(""); setLast4("");
      close();
      return;
    }
    onAdd({
      label: label.trim(),
      balance: round2(parseFloat(balance) || 0),
      creditLimit: round2(parseFloat(creditLimit)),
      cutoffDay: Math.min(31, Math.max(1, parseInt(cutoffDay) || 1)),
      dueDay: Math.min(31, Math.max(1, parseInt(dueDay))),
      apr: round2(parseFloat(apr) || 0),
      minPayment: 0,
      ...(last4 ? { last4 } : {}),
    });
    setLabel(""); setBalance(""); setCreditLimit(""); setCutoffDay(""); setDueDay(""); setApr(""); setLast4("");
    close();
  };

  const submitMsi = (close: () => void) => {
    if (!validMsi) return;
    if (editingPlan && onUpdateInstallment) {
      const months = parseInt(msiMonths) || 12;
      const startDate = msiDate || editingPlan.startDate;
      // El campo se captura en absoluto ("llevo 5 pagadas") pero se guarda como
      // ajuste sobre el calendario, para que siga avanzando solo mes con mes.
      const base = installmentStatus(
        { ...editingPlan, months, startDate, paidAdjust: 0 },
      ).monthsPaid;
      const typed = parseInt(msiPaid);
      const paidAdjust = Number.isFinite(typed)
        ? Math.max(0, Math.min(months, typed)) - base
        : (editingPlan.paidAdjust || 0);
      onUpdateInstallment(editingPlan.id, {
        cardId: msiCardId,
        label: msiLabel.trim(),
        totalAmount: round2(parseFloat(msiAmount)),
        months,
        startDate,
        paidAdjust,
      });
      setEditingPlan(null);
      setMsiLabel(""); setMsiAmount(""); setMsiDate(""); setMsiPaid("");
      close();
      return;
    }
    onAddInstallment({
      cardId: msiCardId,
      label: msiLabel.trim(),
      totalAmount: round2(parseFloat(msiAmount)),
      months: parseInt(msiMonths) || 12,
      startDate: msiDate || todayIso(),
    });
    setMsiLabel(""); setMsiAmount(""); setMsiDate("");
    close();
  };

  const openMsiModal = () => {
    if (!msiCardId && cards.length) setMsiCardId(cards[0].id);
    onMsiOpen();
  };

  return (
    <section className="pop-card">
      <div className="sec-h">
        <h2 className="sec">Tarjetas de crédito</h2>
        <div className="flex gap-2 flex-wrap justify-end">
          {cards.length > 0 && (
            <button type="button" className="btn ghost sm" onClick={openMsiModal}>
              Compra a meses
            </button>
          )}
          <button type="button" className="btn sm" onClick={onOpen}>
            Agregar tarjeta
          </button>
        </div>
      </div>

      {/* Resumen global: contado vs meses */}
      {cards.length > 0 && totals.totalOwed > 0 && (
        <div className="four">
          {[
            { label: "De contado", value: totals.cash, hint: "a liquidar este corte" },
            { label: "A meses (saldo)", value: totals.installmentRemaining, hint: "pendiente total de MSI" },
            { label: "Mensualidad MSI", value: totals.monthlyInstallment, hint: "cargo de este mes" },
            { label: "Deuda total", value: totals.totalOwed, hint: "contado más meses" },
          ].map((x) => (
            <div key={x.label}>
              <small>{x.label}</small>
              <b className="truncate">{money(x.value)}</b>
              <span>{x.hint}</span>
            </div>
          ))}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="empty">
          Sin tarjetas registradas. Agrega tu tarjeta para no volver a pagar intereses por olvido.
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-3 items-start ${cards.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {cards.map((c) => {
            const bd = cardDebtBreakdown(c, installments);
            const util = c.creditLimit > 0 ? Math.min(100, (bd.totalOwed / c.creditLimit) * 100) : 0;
            const due = paymentDueDate(c);
            const daysLeft = daysUntil(due);
            const cut = nextOccurrence(c.cutoffDay);
            const cutDays = daysUntil(cut);
            const pay = payInfo(daysLeft, due);
            const isExpanded = expanded === c.id;
            const nearLimit = util >= 80;
            // Ciclo ya marcado como pagado: el chip lo dice y avisa la fecha del siguiente
            const paid = !!c.lastPaidCycle && c.lastPaidCycle >= isoDate(statementDueDate(c));

            return (
              <div key={c.id} className="card-face">
                <div className="cc-top">
                  <div className="min-w-0">
                    <b className="flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{c.label}</span>
                      <AddedByBadge addedBy={c.addedBy} viewerId={viewerId} dark />
                    </b>
                    <small>Corte día {c.cutoffDay}, pago día {c.dueDay}</small>
                  </div>
                  <div className="flex items-center shrink-0 -mr-2 -mt-2">
                    {c.last4 && (
                      <em aria-label={`Terminación ${c.last4}`} className="mr-1">•••• {c.last4}</em>
                    )}
                    {onUpdateCard && (
                      <button
                        onClick={() => openEditCard(c)}
                        className={FACE_ICON_BTN}
                        aria-label={`Editar ${c.label}`}
                        title="Editar tarjeta"
                      >
                        <Pencil size={16} aria-hidden />
                      </button>
                    )}
                    <button
                      onClick={() => setCardToDelete(c)}
                      className={FACE_ICON_BTN}
                      aria-label={`Eliminar ${c.label}`}
                      title="Eliminar tarjeta"
                    >
                      <Trash2 size={16} aria-hidden />
                    </button>
                  </div>
                </div>

                {/* Desglose contado / meses */}
                <div className="cc-two">
                  <div>
                    <small>De contado</small>
                    <b>{money(bd.cash)}</b>
                  </div>
                  {bd.installmentRemaining > 0 && (
                    <div className="m">
                      <small>A meses</small>
                      <b>{money(bd.installmentRemaining)}</b>
                    </div>
                  )}
                </div>

                {bd.monthlyInstallment > 0 && (
                  <p className="text-xs tnum mb-2 opacity-90">
                    MSI: {money(bd.monthlyInstallment)} al mes. Este corte pagas{" "}
                    <b>{money(bd.dueThisMonth)}</b>.
                  </p>
                )}

                {/* Uso del límite */}
                <div
                  className="cc-lim"
                  role="progressbar" aria-label={`Uso del límite de ${c.label}`}
                  aria-valuenow={Math.round(util)} aria-valuemin={0} aria-valuemax={100}
                >
                  <span style={{ width: `${util}%` }} />
                </div>
                <div className="cc-limt tnum">
                  <span>Usado {money(bd.totalOwed)} de {money(c.creditLimit)}, {util.toFixed(0)}%</span>
                  <span>
                    {nearLimit && "Casi al límite. "}Te quedan {money(Math.max(0, c.creditLimit - bd.totalOwed))}
                  </span>
                </div>

                {/* Fechas clave */}
                <div className="cc-dates">
                  <span className={pay.level === "late" ? "due" : paid ? "paid" : ""}>
                    {paid && "Pagado. "}{pay.text}
                  </span>
                  <span>{cutText(cutDays, cut)}</span>
                </div>

                <div className="cc-acts">
                  {bd.dueThisMonth > 0 && onMarkPaid && (
                    <button onClick={() => setCardToPay(c)} className="pri">
                      Pagado
                    </button>
                  )}
                  {bd.activePlans.length > 0 && (
                    <button onClick={() => setExpanded(isExpanded ? null : c.id)} aria-expanded={isExpanded}>
                      {bd.activePlans.length} MSI
                    </button>
                  )}
                  {bd.cash > 0 && (
                    <button onClick={() => setSimCard(c)}>
                      Simular
                    </button>
                  )}
                </div>

                {/* Lista de compras a meses */}
                {isExpanded && bd.activePlans.length > 0 && (
                  <div className="mt-4 space-y-4 pt-4 border-t border-(--face-line) animate-fade-in-up">
                    {bd.activePlans.map((s) => (
                      <div key={s.plan.id}>
                        <div className="flex justify-between items-center gap-2 mb-1.5">
                          <span className="text-sm font-bold truncate flex items-center gap-1.5 min-w-0">
                            <span className="truncate">{s.plan.label}</span>
                            <AddedByBadge addedBy={s.plan.addedBy} viewerId={viewerId} dark />
                          </span>
                          <div className="flex items-center shrink-0 -mr-2">
                            <span className="text-sm tnum font-bold mr-1">
                              {money(s.monthlyPayment)}<span className="text-(--face-muted) font-normal text-xs"> al mes</span>
                            </span>
                            {onUpdateInstallment && (
                              <button
                                onClick={() => openEditMsi(s.plan)}
                                className={FACE_ICON_BTN}
                                aria-label={`Editar compra a meses ${s.plan.label}`}
                              >
                                <Pencil size={14} aria-hidden />
                              </button>
                            )}
                            <button
                              onClick={() => onRemoveInstallment(s.plan.id)}
                              className={FACE_ICON_BTN}
                              aria-label={`Eliminar compra a meses ${s.plan.label}`}
                            >
                              <Trash2 size={14} aria-hidden />
                            </button>
                          </div>
                        </div>
                        <div className="cc-lim" style={{ height: 8 }}>
                          <span style={{ width: `${s.progress}%`, background: "var(--pop2)" }} />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {onUpdateInstallment && (
                            <span className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => onUpdateInstallment(s.plan.id, { paidAdjust: (s.plan.paidAdjust || 0) - 1 })}
                                disabled={s.monthsPaid <= 0}
                                className="size-9 rounded-full border border-(--face-line) hover:bg-white/10 disabled:opacity-30 transition-colors grid place-items-center"
                                aria-label={`Quitar una mensualidad pagada de ${s.plan.label}`}
                              >
                                <Minus size={14} aria-hidden />
                              </button>
                              <button
                                onClick={() => onUpdateInstallment(s.plan.id, { paidAdjust: (s.plan.paidAdjust || 0) + 1 })}
                                disabled={s.monthsPaid >= s.plan.months}
                                className="size-9 rounded-full border border-(--face-line) hover:bg-white/10 disabled:opacity-30 transition-colors grid place-items-center"
                                aria-label={`Marcar una mensualidad más pagada de ${s.plan.label}`}
                              >
                                <Plus size={14} aria-hidden />
                              </button>
                            </span>
                          )}
                          <p className="text-xs tnum text-(--face-muted)">
                            <span className="text-(--face-fg) font-bold">{s.monthsPaid} de {s.plan.months}</span> pagadas.
                            {" "}Restan {money(s.remainingAmount)}
                            {s.nextChargeDate && `, próximo cargo el ${s.nextChargeDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`}
                          </p>
                          {!!s.plan.paidAdjust && (
                            <span className="text-xs font-bold shrink-0">
                              {s.plan.paidAdjust > 0 ? `+${s.plan.paidAdjust} ajustada` : `${s.plan.paidAdjust} ajustada`}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {bd.dueThisMonth > 0 && daysLeft <= 3 && (
                  <p className="cc-note">
                    {daysLeft < 0
                      ? `El pago de ${money(bd.dueThisMonth)} venció el ${due.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}. Si ya pagaste, toca Pagado; si no, paga cuanto antes para frenar intereses.`
                      : `Paga ${money(bd.dueThisMonth)} antes del ${due.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} para no generar intereses`}
                  </p>
                )}

                <BalanceUpdater current={bd.cash} onSave={(v) => onUpdateBalance(c.id, v)} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: alta de tarjeta ─────────────────────────────── */}
      <Modal isOpen={isOpen} onOpenChange={(o) => { onOpenChange(); if (!o) setEditingCard(null); }} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{editingCard ? `Editar ${editingCard.label}` : "Nueva tarjeta de crédito"}</ModalHeader>
              <ModalBody>
                <div className="flex gap-2">
                  <Input label="Nombre" placeholder="Ej. BBVA Azul, Nu" variant="bordered" value={label} onValueChange={setLabel} className="flex-1" />
                  <Input
                    label="Últimos 4 dígitos" placeholder="1234" variant="bordered" className="w-[150px]"
                    inputMode="numeric" maxLength={4} value={last4}
                    onValueChange={(v) => setLast4(v.replace(/\D/g, "").slice(0, 4))}
                    isInvalid={last4 !== "" && last4.length !== 4}
                    description="Opcional"
                  />
                </div>
                <div className="flex gap-2">
                  {!editingCard && (
                    <Input label="Deuda de contado" type="number" min="0" inputMode="decimal" placeholder="0.00" variant="bordered"
                      startContent={<span className="text-default-400 text-xs">$</span>} value={balance} onValueChange={setBalance} />
                  )}
                  <Input label="Límite de crédito" type="number" min="0" inputMode="decimal" placeholder="0.00" variant="bordered"
                    startContent={<span className="text-default-400 text-xs">$</span>} value={creditLimit} onValueChange={setCreditLimit} />
                </div>
                {editingCard && (
                  <p className="text-[11px] text-default-400">
                    La deuda de contado se actualiza desde la propia tarjeta (campo &quot;Reemplazar deuda&quot; o gastos vinculados).
                  </p>
                )}
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
                <Button color="primary" variant="solid" className="font-bold" isDisabled={!validCard} onPress={() => submitCard(onClose)}>
                  {editingCard ? "Guardar cambios" : "Guardar tarjeta"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Modal: compra a meses sin intereses ────────────────── */}
      <Modal isOpen={isMsiOpen} onOpenChange={(o) => { onMsiChange(); if (!o) setEditingPlan(null); }} backdrop="blur">
        <ModalContent>
          {(onClose) => {
            const amt = parseFloat(msiAmount);
            const mths = parseInt(msiMonths) || 12;
            const monthly = Number.isFinite(amt) && amt > 0 ? amt / mths : 0;
            return (
              <>
                <ModalHeader className="flex items-center gap-2">
                  <Layers size={18} className="text-foreground" />
                  {editingPlan ? `Editar "${editingPlan.label}"` : "Compra a meses sin intereses"}
                </ModalHeader>
                <ModalBody>
                  <Select label="Tarjeta" variant="bordered" selectedKeys={msiCardId ? [msiCardId] : []}
                    onChange={(e) => setMsiCardId(e.target.value)}>
                    {cards.map((c) => <SelectItem key={c.id}>{c.label}</SelectItem>)}
                  </Select>
                  <Input label="¿Qué compraste?" placeholder="Ej. Laptop, Refrigerador" variant="bordered" value={msiLabel} onValueChange={setMsiLabel} />
                  <div className="flex gap-2">
                    <Input label="Monto total" type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" variant="bordered"
                      startContent={<span className="text-default-400 text-xs">$</span>} value={msiAmount} onValueChange={setMsiAmount} className="flex-1" />
                    <Select label="Plazo" variant="bordered" className="w-32" selectedKeys={[msiMonths]}
                      onChange={(e) => setMsiMonths(e.target.value || "12")}>
                      {TERMS.map((t) => <SelectItem key={String(t)}>{`${t} meses`}</SelectItem>)}
                    </Select>
                  </div>
                  <Input label="Fecha de compra" type="date" variant="bordered" value={msiDate} onValueChange={setMsiDate}
                    description="Si la dejas vacía se usa hoy" />

                  {editingPlan && (
                    <Input
                      label="Mensualidades ya pagadas" type="number" min="0" max={String(mths)} step="1"
                      inputMode="numeric" variant="bordered" value={msiPaid} onValueChange={setMsiPaid}
                      endContent={<span className="text-default-400 text-xs">de {mths}</span>}
                      description="Súbela si ya diste por pagada la del mes que viene aunque no llegue tu fecha de pago"
                    />
                  )}

                  {monthly > 0 && (
                    <div className="p-3 rounded-lg bg-ink/5 border border-ink/20 flex items-center gap-3">
                      <CalendarClock size={18} className="text-foreground shrink-0" />
                      <p className="text-sm text-default-600">
                        Pagarás <span className="figure text-xl">{moneyExact(monthly)}</span> al mes durante{" "}
                        <span className="font-bold">{mths} meses</span>.
                      </p>
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>Cancelar</Button>
                  <Button color="primary" variant="solid" className="font-bold"
                    isDisabled={!validMsi} onPress={() => submitMsi(onClose)}>
                    {editingPlan ? "Guardar cambios" : "Agregar a meses"}
                  </Button>
                </ModalFooter>
              </>
            );
          }}
        </ModalContent>
      </Modal>

      {/* ── Modal: marcar deuda de contado como pagada ─────────── */}
      <Modal isOpen={cardToPay !== null} onOpenChange={(o) => { if (!o) setCardToPay(null); }} backdrop="blur" size="sm">
        <ModalContent>
          {(onClose) => {
            const linked = cardToPay ? liabilities.filter((l) => l.cardId === cardToPay.id) : [];
            const bd = cardToPay ? cardDebtBreakdown(cardToPay, installments) : null;
            return (
              <>
                <ModalHeader className="flex items-center gap-2">
                  <BadgeCheck size={18} className="text-foreground" />
                  Marcar como pagada
                </ModalHeader>
                <ModalBody>
                  <p className="text-sm text-default-600">
                    La deuda de contado de <span className="font-bold">{cardToPay?.label}</span>{" "}
                    (<span className="font-bold tnum">{money(bd?.cash || 0)}</span>) quedará en <span className="font-bold">$0</span>.
                  </p>
                  {cardToPay && (
                    <p className="text-xs text-default-600">
                      Se marcará como pagado el estado de cuenta que vence el{" "}
                      <span className="font-bold">{statementDueDate(cardToPay).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</span>.
                    </p>
                  )}
                  {linked.length > 0 && (
                    <p className="text-xs text-default-500">
                      También se quitarán sus <span className="font-bold">{linked.length} gasto{linked.length > 1 ? "s" : ""} vinculado{linked.length > 1 ? "s" : ""}</span> de
                      Gastos &amp; Deudas. Tu balance disponible se libera.
                    </p>
                  )}
                  {bd && bd.installmentRemaining > 0 && (
                    <p className="text-xs text-default-600">
                      Tus compras a meses no se tocan: sigues debiendo {money(bd.installmentRemaining)} en mensualidades.
                    </p>
                  )}
                  <p className="text-[11px] text-default-400">Tendrás 5 segundos para deshacerlo.</p>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>Cancelar</Button>
                  <Button
                    color="success" variant="solid" className="font-bold"
                    startContent={<BadgeCheck size={15} />}
                    onPress={() => {
                      if (cardToPay && onMarkPaid) onMarkPaid(cardToPay.id);
                      setCardToPay(null);
                      onClose();
                    }}
                  >
                    Sí, ya pagué
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
                  <AlertTriangle size={18} className="text-money-out-text" />
                  Eliminar tarjeta
                </ModalHeader>
                <ModalBody>
                  <p className="text-sm text-default-600">
                    ¿Seguro que quieres eliminar <span className="font-bold">{cardToDelete?.label}</span>?
                  </p>
                  {plans.length > 0 && (
                    <div className="p-3 rounded-lg bg-ink/5 border border-ink/20">
                      <p className="text-xs text-default-600">
                        También se eliminarán sus{" "}
                        <span className="font-bold">{plans.length} compra{plans.length > 1 ? "s" : ""} a meses</span>:
                      </p>
                      <ul className="mt-1.5 space-y-0.5 list-disc pl-4">
                        {plans.map((p) => (
                          <li key={p.id} className="text-xs text-default-600 tnum">
                            {p.label}: {money(p.totalAmount)} a {p.months} meses
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
                    color="danger" variant="solid" className="font-bold"
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
    </section>
  );
}
