"use client";

import { useState } from "react";
import { useDisclosure } from "@heroui/react";
import { Sheet } from "@/components/ui/Sheet";
import { celebrate, originOf } from "@/components/ui/SuccessReveal";
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
import { Picker } from "./ui/Picker";

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
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isMsiOpen, onOpen: onMsiOpen, onClose: onMsiChange } = useDisclosure();
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

      {/* ── Hoja: alta y edición de tarjeta ─────────────────────── */}
      <Sheet
        open={isOpen}
        onOpenChange={(o) => { if (!o) { setEditingCard(null); onClose(); } else onOpen(); }}
        title={editingCard ? `Editar ${editingCard.label}` : "Nueva tarjeta de crédito"}
      >
        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); submitCard(onClose); }}>
          <div className="row2" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
            <div className="f">
              <label htmlFor="cc-label">Nombre</label>
              <input id="cc-label" placeholder="Ej. BBVA Azul, Nu" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <div className="f">
              <label htmlFor="cc-last4">Últimos 4 dígitos</label>
              <input
                id="cc-last4" placeholder="1234" inputMode="numeric" maxLength={4} value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className={last4 !== "" && last4.length !== 4 ? "err" : ""}
              />
            </div>
          </div>
          <div className="row2">
            {!editingCard && (
              <div className="f">
                <label htmlFor="cc-balance">Deuda de contado</label>
                <input id="cc-balance" type="number" min="0" inputMode="decimal" placeholder="$ 0.00" value={balance} onChange={(e) => setBalance(e.target.value)} />
              </div>
            )}
            <div className="f">
              <label htmlFor="cc-limit">Límite de crédito</label>
              <input id="cc-limit" type="number" min="0" inputMode="decimal" placeholder="$ 0.00" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
            </div>
          </div>
          {editingCard && (
            <p className="mute text-xs">
              La deuda de contado se actualiza desde la propia tarjeta (campo «Reemplazar deuda» o gastos vinculados).
            </p>
          )}
          <div className="row2" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <div className="f">
              <label htmlFor="cc-cut">Día de corte</label>
              <input id="cc-cut" type="number" min="1" max="31" placeholder="15" value={cutoffDay} onChange={(e) => setCutoffDay(e.target.value)} />
            </div>
            <div className="f">
              <label htmlFor="cc-due">Día límite de pago</label>
              <input id="cc-due" type="number" min="1" max="31" placeholder="5" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </div>
            <div className="f">
              <label htmlFor="cc-apr">Tasa anual %</label>
              <input id="cc-apr" type="number" min="0" placeholder="60" value={apr} onChange={(e) => setApr(e.target.value)} />
            </div>
          </div>
          <p className="mute text-xs">
            Las compras a meses se agregan aparte, con el botón «Compra a meses».
          </p>
          <div className="ft">
            <button type="button" className="btn soft" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn" disabled={!validCard}>
              {editingCard ? "Guardar cambios" : "Guardar tarjeta"}
            </button>
          </div>
        </form>
      </Sheet>

      {/* ── Hoja: compra a meses sin intereses ──────────────────── */}
      {(() => {
        const amt = parseFloat(msiAmount);
        const mths = parseInt(msiMonths) || 12;
        const monthly = Number.isFinite(amt) && amt > 0 ? amt / mths : 0;
        const closeMsi = () => onMsiChange();
        return (
          <Sheet
            open={isMsiOpen}
            onOpenChange={(o) => { if (!o) { setEditingPlan(null); closeMsi(); } else onMsiOpen(); }}
            title={editingPlan ? `Editar «${editingPlan.label}»` : "Compra a meses sin intereses"}
          >
            <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); submitMsi(closeMsi); }}>
              <div className="f">
                <label htmlFor="msi-card">Tarjeta</label>
                <Picker id="msi-card" variant="field" label="Tarjeta" value={msiCardId} onChange={setMsiCardId}
                  options={cards.map((c) => ({ value: c.id, label: c.label }))} />
              </div>
              <div className="f">
                <label htmlFor="msi-label">¿Qué compraste?</label>
                <input id="msi-label" placeholder="Ej. Laptop, Refrigerador" value={msiLabel} onChange={(e) => setMsiLabel(e.target.value)} />
              </div>
              <div className="row2">
                <div className="f">
                  <label htmlFor="msi-amount">Monto total</label>
                  <input id="msi-amount" type="number" min="0" step="0.01" inputMode="decimal" placeholder="$ 0.00" value={msiAmount} onChange={(e) => setMsiAmount(e.target.value)} />
                </div>
                <div className="f">
                  <label htmlFor="msi-months">Plazo</label>
                  <Picker id="msi-months" variant="field" label="Plazo" value={msiMonths} onChange={(v) => setMsiMonths(v || "12")}
                    options={TERMS.map((t) => ({ value: String(t), label: `${t} meses` }))} />
                </div>
              </div>
              <div className="f">
                <label htmlFor="msi-date">Fecha de compra</label>
                <input id="msi-date" type="date" value={msiDate} onChange={(e) => setMsiDate(e.target.value)} />
                <span className="mute text-xs">Si la dejas vacía se usa hoy</span>
              </div>

              {editingPlan && (
                <div className="f">
                  <label htmlFor="msi-paid">Mensualidades ya pagadas (de {mths})</label>
                  <input id="msi-paid" type="number" min="0" max={String(mths)} step="1" inputMode="numeric" value={msiPaid} onChange={(e) => setMsiPaid(e.target.value)} />
                  <span className="mute text-xs">Súbela si ya diste por pagada la del mes que viene aunque no llegue tu fecha de pago</span>
                </div>
              )}

              {monthly > 0 && (
                <p className="callout brand flex items-center gap-2">
                  <CalendarClock size={18} className="shrink-0" aria-hidden />
                  <span>
                    Pagarás <b className="text-lg tnum">{moneyExact(monthly)}</b> al mes durante <b>{mths} meses</b>.
                  </span>
                </p>
              )}

              <div className="ft">
                <button type="button" className="btn soft" onClick={closeMsi}>Cancelar</button>
                <button type="submit" className="btn" disabled={!validMsi}>
                  {editingPlan ? "Guardar cambios" : "Agregar a meses"}
                </button>
              </div>
            </form>
          </Sheet>
        );
      })()}

      {/* ── Hoja: marcar deuda de contado como pagada ───────────── */}
      {(() => {
        const linked = cardToPay ? liabilities.filter((l) => l.cardId === cardToPay.id) : [];
        const bd = cardToPay ? cardDebtBreakdown(cardToPay, installments) : null;
        const closePay = () => setCardToPay(null);
        return (
          <Sheet open={cardToPay !== null} onOpenChange={(o) => { if (!o) closePay(); }} title="Marcar como pagada">
            <p className="text-[0.9375rem] leading-relaxed">
              La deuda de contado de <b>{cardToPay?.label}</b> (<b className="tnum">{money(bd?.cash || 0)}</b>) quedará en <b>$0</b>.
            </p>
            {cardToPay && (
              <p className="callout">
                Se marcará como pagado el estado de cuenta que vence el{" "}
                <b>{statementDueDate(cardToPay).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</b>.
              </p>
            )}
            {linked.length > 0 && (
              <p className="callout">
                También se quitarán sus <b>{linked.length} gasto{linked.length > 1 ? "s" : ""} vinculado{linked.length > 1 ? "s" : ""}</b> de
                Gastos y deudas. Tu balance disponible se libera.
              </p>
            )}
            {bd && bd.installmentRemaining > 0 && (
              <p className="callout brand">
                Tus compras a meses no se tocan: sigues debiendo {money(bd.installmentRemaining)} en mensualidades.
              </p>
            )}
            <p className="summary" style={{ margin: 0 }}>Tendrás 5 segundos para deshacerlo.</p>
            <div className="ft">
              <button type="button" className="btn soft" onClick={closePay}>Cancelar</button>
              <button
                type="button" className="btn"
                onClick={(e) => {
                  if (!cardToPay || !onMarkPaid) return;
                  const origin = originOf(e.currentTarget);
                  const paid = cardToPay;
                  const amount = bd?.dueThisMonth || bd?.cash || 0;
                  onMarkPaid(paid.id);
                  closePay();
                  celebrate({ amount: money(amount), text: `Pago registrado: ${paid.label}`, tone: "paid", ...origin });
                }}
              >
                <BadgeCheck size={16} aria-hidden /> Sí, ya pagué
              </button>
            </div>
          </Sheet>
        );
      })()}

      {/* ── Hoja: confirmar eliminación de tarjeta ──────────────── */}
      {(() => {
        const plans = cardToDelete ? installments.filter((p) => p.cardId === cardToDelete.id) : [];
        const closeDel = () => setCardToDelete(null);
        return (
          <Sheet open={cardToDelete !== null} onOpenChange={(o) => { if (!o) closeDel(); }} title="Eliminar tarjeta">
            <p className="text-[0.9375rem] leading-relaxed">
              ¿Seguro que quieres eliminar <b>{cardToDelete?.label}</b>?
            </p>
            {plans.length > 0 && (
              <div className="callout warn">
                <p>
                  También se eliminarán sus <b>{plans.length} compra{plans.length > 1 ? "s" : ""} a meses</b>:
                </p>
                <ul className="mt-1.5 space-y-0.5 list-disc pl-4">
                  {plans.map((p) => (
                    <li key={p.id} className="text-xs tnum">{p.label}: {money(p.totalAmount)} a {p.months} meses</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="summary" style={{ margin: 0 }}>
              Podrás deshacerlo durante 5 segundos con el botón que aparecerá abajo.
            </p>
            <div className="ft">
              <button type="button" className="btn soft" onClick={closeDel}>Cancelar</button>
              <button
                type="button" className="btn danger"
                onClick={() => { if (cardToDelete) onRemove(cardToDelete.id); closeDel(); }}
              >
                <Trash2 size={16} aria-hidden /> Sí, eliminar
              </button>
            </div>
          </Sheet>
        );
      })()}

      <DebtSimulator card={simCard} onClose={() => setSimCard(null)} />
    </section>
  );
}
