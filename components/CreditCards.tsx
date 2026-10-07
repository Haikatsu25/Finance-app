"use client";

import { useState } from "react";
import {
  Card, CardHeader, CardBody, Input, Button, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
} from "@heroui/react";
import {
  CreditCard as CreditCardIcon, Plus, Trash2, Calculator, AlertTriangle,
  Check, CalendarClock, Layers, ChevronDown, ChevronUp, BadgeCheck, Pencil, Minus, Scissors,
} from "lucide-react";
import { CreditCardItem, InstallmentPlan, FinanceItem } from "@/types";
import { money, moneyExact, round2 } from "@/lib/format";
import {
  nextOccurrence, paymentDueDate, statementDueDate, daysUntil, cardDebtBreakdown, totalDebtBreakdown, installmentStatus, todayIso } from "@/lib/finance-utils";
import DebtSimulator from "./DebtSimulator";
import AddedByBadge from "./AddedByBadge";

const TERMS = [3, 6, 9, 12, 18, 24];

// ─────────────────────────────────────────────────────────────────
// FRANJA LATERAL — cada tarjeta se reconoce por su trama, no por color.
// La trama sale de un hash del id (estable aunque cambie el orden) y, si ya
// la usa otra tarjeta, avanza a la siguiente libre. Con más de 8 se repiten.
// ─────────────────────────────────────────────────────────────────
const STRIPE_COUNT = 8;

function assignStripes(cards: CreditCardItem[]): Map<string, number> {
  const taken = new Set<number>();
  const out = new Map<string, number>();
  for (const c of cards) {
    let h = 0;
    for (const ch of c.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    let i = h % STRIPE_COUNT;
    for (let k = 0; k < STRIPE_COUNT && taken.has(i); k++) i = (i + 1) % STRIPE_COUNT;
    taken.add(i);
    out.set(c.id, i);
    if (taken.size === STRIPE_COUNT) taken.clear();
  }
  return out;
}

const fmtShort = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "short" });

/** "hoy", "mañana", "en 4 días", "hace 2 días" */
function whenText(days: number): string {
  if (days < 0) return `hace ${Math.abs(days)} ${Math.abs(days) === 1 ? "día" : "días"}`;
  if (days === 0) return "hoy";
  if (days === 1) return "mañana";
  return `en ${days} días`;
}

/** Urgencia por FORMA (relleno, contorno, texto), no por color. */
type PayLevel = "late" | "soon" | "calm";

function payInfo(days: number, date: Date): { text: string; level: PayLevel } {
  if (days < 0) return { text: `Pago vencido ${whenText(days)}`, level: "late" };
  if (days === 0) return { text: `Pagas HOY (${fmtShort(date)})`, level: "late" };
  const text = `Pagas el ${fmtShort(date)}, ${whenText(days)}`;
  return { text, level: days <= 3 ? "soon" : "calm" };
}

function cutText(days: number, date: Date): string {
  return days === 0 ? `Corta HOY (${fmtShort(date)})` : `Corta el ${fmtShort(date)}, ${whenText(days)}`;
}

const PAY_CLS: Record<PayLevel, string> = {
  late: "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-bold bg-(--face-fg) text-(--face-bg)",
  soon: "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-bold border-2 border-(--face-fg)",
  calm: "inline-flex items-center gap-1.5 text-[13px] text-(--face-muted)",
};

const FACE_BTN = "h-11 min-w-11 px-3.5 rounded-lg text-[13px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors border border-(--face-line) hover:bg-white/10";
const FACE_ICON_BTN = "w-11 h-11 grid place-items-center rounded-lg text-(--face-muted) transition-colors hover:bg-white/10";

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
        <Input
          size="md"
          variant="flat"
          type="number"
          min="0"
          inputMode="decimal"
          placeholder={`Saldo actual: ${current.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`}
          aria-label="Reemplazar deuda de contado"
          value={value}
          onValueChange={setValue}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
          startContent={<span className="text-(--face-muted) text-sm font-bold">$</span>}
          classNames={{
            inputWrapper: "bg-white/10 hover:bg-white/15 data-[hover=true]:bg-white/15 h-11 min-h-11",
            input: "text-(--face-fg) text-sm",
          }}
        />
        <Button
          isIconOnly
          className="h-11 w-11 min-w-11 shrink-0 font-bold bg-(--face-fg) text-(--face-bg)"
          isDisabled={!valid && !saved}
          onPress={commit}
          aria-label="Guardar nueva deuda"
        >
          <Check size={18} />
        </Button>
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
  const stripes = assignStripes(cards);

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
    <Card className="glass card-hover rule-out col-span-1 sm:col-span-2 lg:col-span-3 shadow-none">
      <CardHeader className="flex justify-between items-start px-5 pt-4 pb-0 gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-base font-bold tracking-tight flex items-center gap-2">
            <CreditCardIcon size={18} className="text-money-out-text shrink-0" aria-hidden />
            Tarjetas de crédito
          </h3>
          <p className="text-xs text-default-500 mt-0.5">Cortes, fechas límite, contado y meses sin intereses</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {cards.length > 0 && (
            <Button variant="bordered" startContent={<Layers size={16} />} onPress={openMsiModal} className="h-11 min-w-11 font-bold border-2 border-foreground">
              Compra a meses
            </Button>
          )}
          <Button color="primary" variant="solid" startContent={<Plus size={16} />} onPress={onOpen} className="h-11 min-w-11 font-bold">
            Agregar tarjeta
          </Button>
        </div>
      </CardHeader>

      <CardBody className="px-5 py-4">
        {/* Resumen global: contado vs meses. Los cuadritos repiten la leyenda de la tira de reparto. */}
        {cards.length > 0 && (totals.totalOwed > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-5 mb-5">
            {[
              { label: "De contado", value: totals.cash, hint: "a liquidar este corte", sw: "seg-out" },
              { label: "A meses (saldo)", value: totals.installmentRemaining, hint: "pendiente total de MSI", sw: "border-2 border-money-out" },
              { label: "Mensualidad MSI", value: totals.monthlyInstallment, hint: "cargo de este mes", sw: "seg-msi" },
              { label: "Deuda total", value: totals.totalOwed, hint: "contado más meses", sw: "" },
            ].map((x) => (
              <div key={x.label} className="min-w-0">
                <p className="text-xs font-semibold text-default-500 flex items-center gap-2">
                  {x.sw && <span className={`inline-block w-3.5 h-3.5 rounded-[3px] shrink-0 ${x.sw}`} aria-hidden />}
                  {x.label}
                </p>
                <p className="figure text-[1.9rem] mt-1 truncate">{money(x.value)}</p>
                <p className="text-[11px] text-default-500">{x.hint}</p>
              </div>
            ))}
          </div>
        )}

        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-default-300 rounded-lg text-default-500 gap-1">
            <p className="text-xs font-semibold">Sin tarjetas registradas</p>
            <p className="text-[11px]">Agrega tu tarjeta para no volver a pagar intereses por olvido</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

              return (
                <div key={c.id} className="card-face group">
                  <span className={`card-stripe stripe-${stripes.get(c.id) ?? 0}`} aria-hidden />

                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-base flex items-center gap-1.5 flex-wrap">
                        <span className="truncate">{c.label}</span>
                        <AddedByBadge addedBy={c.addedBy} viewerId={viewerId} dark />
                      </p>
                      <p className="text-xs text-(--face-muted)">Corte día {c.cutoffDay}, pago día {c.dueDay}</p>
                    </div>
                    <div className="flex items-center shrink-0 -mr-2 -mt-2">
                      {onUpdateCard && (
                        <button
                          onClick={() => openEditCard(c)}
                          className={`${FACE_ICON_BTN} hover:text-(--face-fg)`}
                          aria-label={`Editar ${c.label}`}
                          title="Editar tarjeta"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => setCardToDelete(c)}
                        className={`${FACE_ICON_BTN} hover:text-(--face-fg)`}
                        aria-label={`Eliminar ${c.label}`}
                        title="Eliminar tarjeta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {c.last4 && (
                    <p className="figure text-[2.75rem] mt-1" aria-label={`Terminación ${c.last4}`}>
                      <span className="text-(--face-muted) text-[0.55em] mr-2 align-middle" aria-hidden>••••</span>
                      {c.last4}
                    </p>
                  )}

                  {/* Desglose contado / meses */}
                  <div className="flex items-end gap-5 mt-3">
                    <div>
                      <p className="text-xs text-(--face-muted)">De contado</p>
                      <p className="figure text-[2.25rem]">{money(bd.cash)}</p>
                    </div>
                    {bd.installmentRemaining > 0 && (
                      <div className="pb-0.5">
                        <p className="text-xs text-(--face-muted)">A meses</p>
                        <p className="figure text-[1.6rem] text-(--face-muted)">{money(bd.installmentRemaining)}</p>
                      </div>
                    )}
                  </div>

                  {bd.monthlyInstallment > 0 && (
                    <p className="text-xs mt-1.5 tnum">
                      MSI: {money(bd.monthlyInstallment)} al mes. Este corte pagas{" "}
                      <span className="font-bold">{money(bd.dueThisMonth)}</span>.
                    </p>
                  )}

                  {/* Uso del límite: la parte usada es siempre deuda (token de salida) */}
                  <div className="mt-4">
                    <div className="flex justify-between items-baseline gap-2 text-xs tnum">
                      <span className="text-(--face-muted)">Usas {money(bd.totalOwed)} de {money(c.creditLimit)}</span>
                      <span className="font-bold text-sm">{util.toFixed(0)}%</span>
                    </div>
                    <div
                      className="h-2.5 rounded-sm bg-white/15 mt-1.5 overflow-hidden"
                      role="progressbar" aria-label={`Uso del límite de ${c.label}`}
                      aria-valuenow={Math.round(util)} aria-valuemin={0} aria-valuemax={100}
                    >
                      <div className="h-full bg-(--money-out) transition-all duration-500" style={{ width: `${util}%` }} />
                    </div>
                    <p className={`text-xs mt-1.5 tnum flex items-center gap-1.5 ${nearLimit ? "font-bold" : "text-(--face-muted)"}`}>
                      {nearLimit && <AlertTriangle size={13} aria-hidden />}
                      {nearLimit && "Casi al límite. "}Te quedan {money(Math.max(0, c.creditLimit - bd.totalOwed))}
                    </p>
                  </div>

                  {/* Fechas clave: lo que más se consulta */}
                  <div className="mt-4 space-y-2">
                    <p className={PAY_CLS[pay.level]}>
                      {pay.level === "calm" ? <CalendarClock size={14} aria-hidden /> : <AlertTriangle size={14} aria-hidden />}
                      {pay.text}
                    </p>
                    <p className="text-[13px] text-(--face-muted) flex items-center gap-1.5">
                      <Scissors size={14} aria-hidden />
                      {cutText(cutDays, cut)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap mt-4">
                    {bd.dueThisMonth > 0 && onMarkPaid ? (
                      <button
                        onClick={() => setCardToPay(c)}
                        className={`${FACE_BTN} bg-(--face-fg) text-(--face-bg) border-transparent hover:bg-(--face-fg)/90`}
                      >
                        <BadgeCheck size={16} aria-hidden />
                        Pagado
                      </button>
                    ) : <span />}
                    <div className="flex gap-2">
                      {bd.activePlans.length > 0 && (
                        <button onClick={() => setExpanded(isExpanded ? null : c.id)} className={FACE_BTN} aria-expanded={isExpanded}>
                          <Layers size={15} aria-hidden />
                          {bd.activePlans.length} MSI
                          {isExpanded ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
                        </button>
                      )}
                      {bd.cash > 0 && (
                        <button onClick={() => setSimCard(c)} className={FACE_BTN}>
                          <Calculator size={15} aria-hidden />
                          Simular
                        </button>
                      )}
                    </div>
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
                                  className={`${FACE_ICON_BTN} hover:text-(--face-fg)`}
                                  aria-label={`Editar compra a meses ${s.plan.label}`}
                                >
                                  <Pencil size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => onRemoveInstallment(s.plan.id)}
                                className={`${FACE_ICON_BTN} hover:text-(--face-fg)`}
                                aria-label={`Eliminar compra a meses ${s.plan.label}`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="h-2 rounded-sm bg-white/15 mb-2 overflow-hidden">
                            <div className="h-full bg-(--face-fg) transition-all duration-500" style={{ width: `${s.progress}%` }} />
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {onUpdateInstallment && (
                              <span className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => onUpdateInstallment(s.plan.id, { paidAdjust: (s.plan.paidAdjust || 0) - 1 })}
                                  disabled={s.monthsPaid <= 0}
                                  className="w-9 h-9 rounded-lg border border-(--face-line) hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center justify-center"
                                  aria-label={`Quitar una mensualidad pagada de ${s.plan.label}`}
                                >
                                  <Minus size={14} />
                                </button>
                                <button
                                  onClick={() => onUpdateInstallment(s.plan.id, { paidAdjust: (s.plan.paidAdjust || 0) + 1 })}
                                  disabled={s.monthsPaid >= s.plan.months}
                                  className="w-9 h-9 rounded-lg border border-(--face-line) hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center justify-center"
                                  aria-label={`Marcar una mensualidad más pagada de ${s.plan.label}`}
                                >
                                  <Plus size={14} />
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
                    <p className="mt-3 text-xs flex items-start gap-1.5">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" aria-hidden />
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
      </CardBody>

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
    </Card>
  );
}
