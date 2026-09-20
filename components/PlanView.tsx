"use client";

import React, { useMemo, useState } from "react";
import { Card, CardBody, Input, Button, Select, SelectItem } from "@heroui/react";
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Layers, ReceiptText,
  Plus, Trash2, Copy, Repeat, CreditCard as CreditCardIcon, Minus, Check,
  CalendarRange, AlertTriangle, Landmark, Target,
} from "lucide-react";
import { TransactionItem, SubscriptionItem, InstallmentPlan, CreditCardItem, FinanceItem } from "@/types";
import { money, moneySmart, moneyParts, round2 } from "@/lib/format";
import { planMonth, monthKey, shiftMonth, monthLabel } from "@/lib/finance-utils";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "./Transactions";
import AddedByBadge from "./AddedByBadge";

// ─────────────────────────────────────────────────────────────────
// PLAN DEL MES — la cara "futura" de Inicio. Misma jerarquía visual
// (tarjeta negra, tiles, secciones) pero con lo que ya sabes de un
// mes que aún no llega: ingresos esperados, compromisos y planeados.
// ─────────────────────────────────────────────────────────────────

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Cambia el mes de una fecha ISO conservando el día (acotado al mes). */
function moveToMonth(iso: string, key: string): string {
  const [y, m] = key.split("-").map(Number);
  const day = parseInt(iso.slice(8, 10), 10) || 1;
  const last = new Date(y, m, 0).getDate();
  return `${key}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

export default function PlanView({
  month, onMonthChange, minMonth, maxMonth,
  transactions, subscriptions, installments, cards, accounts = [],
  startBalance,
  onAddTransaction, onRemoveTransaction, onUpdateTransaction, onUpdateInstallment,
  extraExpenseCats = [], extraIncomeCats = [], viewerId,
}: {
  month: string;
  onMonthChange: (key: string) => void;
  minMonth: string;
  maxMonth: string;
  transactions: TransactionItem[];
  subscriptions: SubscriptionItem[];
  installments: InstallmentPlan[];
  cards: CreditCardItem[];
  accounts?: FinanceItem[];
  /** Disponible real al cerrar el mes actual: punto de partida de la línea de tiempo */
  startBalance: number;
  onAddTransaction: (t: Omit<TransactionItem, "id">) => void;
  onRemoveTransaction: (id: string) => void;
  onUpdateTransaction?: (id: string, patch: Partial<TransactionItem>) => void;
  onUpdateInstallment?: (id: string, patch: Partial<InstallmentPlan>) => void;
  extraExpenseCats?: string[];
  extraIncomeCats?: string[];
  viewerId?: string;
}) {
  const plan = useMemo(
    () => planMonth(month, { transactions, subscriptions, installments, cards }),
    [month, transactions, subscriptions, installments, cards],
  );

  const currentMonth = monthKey(new Date());
  const prevMonth = shiftMonth(month, -1);
  const todayIso = new Date().toISOString().split("T")[0];
  const daysToStart = (() => {
    const [y, m] = month.split("-").map(Number);
    const first = new Date(y, m - 1, 1);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((first.getTime() - today.getTime()) / 86400000);
  })();

  const closing = round2(startBalance + plan.balance);
  const positive = plan.balance >= 0;
  const expenseCats = [...EXPENSE_CATEGORIES.slice(0, -1), ...extraExpenseCats, "Otros"];
  const incomeCats = [...INCOME_CATEGORIES.slice(0, -1), ...extraIncomeCats, "Otros"];

  // ── Formularios inline (uno por sección) ─────────────────────
  const [openForm, setOpenForm] = useState<"income" | "expense" | null>(null);
  const [fLabel, setFLabel] = useState("");
  const [fAmount, setFAmount] = useState("");
  const [fDate, setFDate] = useState("");
  const [fCat, setFCat] = useState("");
  const fValid = fLabel.trim() !== "" && Number.isFinite(parseFloat(fAmount)) && parseFloat(fAmount) > 0;

  const openAdd = (type: "income" | "expense") => {
    setOpenForm(type);
    setFLabel(""); setFAmount("");
    setFDate(`${month}-01`);
    setFCat(type === "income" ? incomeCats[0] : expenseCats[0]);
  };

  const submitAdd = () => {
    if (!openForm || !fValid) return;
    const date = fDate && monthKey(fDate) === month ? fDate : `${month}-01`;
    onAddTransaction({
      label: fLabel.trim(),
      amount: round2(parseFloat(fAmount)),
      date,
      type: openForm,
      category: fCat,
      source: "manual",
      // Planeado: no toca cuentas hasta que lo marques como pagado
    });
    setOpenForm(null);
  };

  // ── Copiar del mes anterior (sin duplicar etiquetas ya presentes) ──
  const copyFromPrev = (type: "income" | "expense") => {
    const existing = new Set(
      (type === "income" ? plan.incomeItems : plan.plannedItems).map((t) => t.label.trim().toLowerCase()),
    );
    const src = transactions.filter((t) =>
      t.type === type && monthKey(t.date) === prevMonth && t.source !== "fixed" &&
      !existing.has(t.label.trim().toLowerCase()),
    );
    for (const t of src) {
      onAddTransaction({
        label: t.label,
        amount: t.amount,
        date: moveToMonth(t.date, month),
        type,
        category: t.category,
        source: "manual",
      });
    }
  };
  const prevIncomeCount = transactions.filter((t) => t.type === "income" && monthKey(t.date) === prevMonth).length;
  const prevExpenseCount = transactions.filter((t) => t.type === "expense" && monthKey(t.date) === prevMonth && t.source !== "fixed").length;

  // ── "Ya lo pagué": asignar cuenta a un planeado cuya fecha ya llegó ──
  const [payingId, setPayingId] = useState<string | null>(null);
  const canMarkPaid = (t: TransactionItem) => !!onUpdateTransaction && accounts.length > 0 && !t.accountId && t.date <= todayIso;

  // ── Línea de tiempo en cascada ─────────────────────────────
  let running = startBalance;
  const timeline = plan.events.map((e) => {
    running = round2(running + e.amount);
    return { ...e, after: running };
  });
  const firstNegative = timeline.find((r) => r.after < 0);

  const p = moneyParts(Math.abs(plan.balance));

  // Funciones de render (no componentes): si fueran componentes internos se
  // remontarían en cada tecleo y los inputs perderían el foco.
  const renderTx = (t: TransactionItem, tone: "income" | "expense") => {
    const isInc = tone === "income";
    return (
      <div key={t.id} className={`group flex justify-between items-center gap-2 p-2.5 rounded-xl border border-transparent hover:border-default-200 transition-colors ${
        isInc ? "bg-emerald-500/10" : "bg-cyan-500/10"
      }`}>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-default-700 truncate flex items-center gap-1.5">
            {t.label}
            {t.accountId && <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">pagado</span>}
          </p>
          <p className="text-[10px] text-default-400 flex items-center gap-1.5 flex-wrap">
            {t.category || "Sin categoría"} · {new Date(t.date + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
            {t.accountId && accounts.find((a) => a.id === t.accountId) && (
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">· {accounts.find((a) => a.id === t.accountId)!.label}</span>
            )}
            <AddedByBadge addedBy={t.addedBy} viewerId={viewerId} />
          </p>
          {payingId === t.id && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Select size="sm" variant="bordered" aria-label="¿De qué cuenta salió?" className="w-44"
                startContent={<Landmark size={12} className="text-default-400" />}
                onChange={(e) => {
                  if (e.target.value && onUpdateTransaction) {
                    onUpdateTransaction(t.id, { accountId: e.target.value });
                    setPayingId(null);
                  }
                }}>
                {accounts.map((a) => <SelectItem key={a.id} textValue={a.label}>{a.label}</SelectItem>)}
              </Select>
              <Button size="sm" variant="light" className="h-8 min-w-0 px-2 text-default-400" onPress={() => setPayingId(null)}>Cancelar</Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`tnum font-bold text-sm ${isInc ? "text-emerald-500" : "text-default-700"}`}>
            {isInc ? "+" : "−"}{moneySmart(t.amount)}
          </span>
          {canMarkPaid(t) && payingId !== t.id && (
            <button
              onClick={() => setPayingId(t.id)}
              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
              title="Ya lo pagué: asigna la cuenta de la que salió"
            >
              <Check size={11} /> Ya {isInc ? "llegó" : "pagué"}
            </button>
          )}
          <button
            onClick={() => onRemoveTransaction(t.id)}
            className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 text-default-300 hover:text-rose-500 transition-all p-1.5 rounded-lg hover:bg-rose-500/10"
            aria-label={`Eliminar ${t.label}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

  const renderForm = (type: "income" | "expense") => (
    <div className="flex flex-col gap-2 p-3 rounded-xl bg-default-100/60 border border-default-200/60 animate-fade-in-up">
      <Input placeholder={type === "income" ? "¿De dónde? (ej. Nómina)" : "¿En qué? (ej. Súper)"} size="sm" variant="bordered" value={fLabel} onValueChange={setFLabel} autoFocus />
      <div className="flex gap-2 flex-wrap">
        <Input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" size="sm" variant="bordered"
          startContent={<span className="text-default-400 text-xs font-bold">$</span>}
          className="w-28" value={fAmount} onValueChange={setFAmount}
          onKeyDown={(e) => { if (e.key === "Enter") submitAdd(); }} />
        <Input type="date" size="sm" variant="bordered" aria-label="Fecha" className="w-[140px]" value={fDate} onValueChange={setFDate} />
        <Select size="sm" variant="bordered" aria-label="Categoría" className="w-36"
          selectedKeys={fCat ? [fCat] : []} onChange={(e) => setFCat(e.target.value || "Otros")}>
          {(type === "income" ? incomeCats : expenseCats).map((c) => <SelectItem key={c}>{c}</SelectItem>)}
        </Select>
      </div>
      <div className="flex gap-2">
        <Button size="sm" color={type === "income" ? "success" : "primary"} variant="shadow" className="font-bold"
          isDisabled={!fValid} startContent={<Plus size={14} />} onPress={submitAdd}>
          Agregar a {cap(monthLabel(month).split(" de ")[0])}
        </Button>
        <Button size="sm" variant="light" className="text-default-400" onPress={() => setOpenForm(null)}>Cancelar</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in-up" id="plan-view">
      {/* Navegación de mes */}
      <div className="flex items-center justify-between gap-2 bg-default-100/70 rounded-2xl p-1.5">
        <button onClick={() => onMonthChange(shiftMonth(month, -1))} disabled={month <= minMonth}
          className="p-2 rounded-xl hover:bg-default-200 text-default-500 disabled:opacity-30" aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-black capitalize">{monthLabel(month)}</p>
          <p className="text-[10px] text-default-400 font-semibold">
            planeando · {daysToStart > 1 ? `empieza en ${daysToStart} días` : daysToStart === 1 ? "empieza mañana" : "ya empezó"}
          </p>
        </div>
        <button onClick={() => onMonthChange(shiftMonth(month, 1))} disabled={month >= maxMonth}
          className="p-2 rounded-xl hover:bg-default-200 text-default-500 disabled:opacity-30" aria-label="Mes siguiente">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Hero + tiles: misma jerarquía que Inicio */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <Card className={`col-span-1 md:col-span-8 border-0 overflow-hidden relative rounded-3xl ${positive ? "hero-card glow-hero-positive" : "hero-card-negative glow-hero-negative"}`}>
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-white/10" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full border border-white/5" />
          <CardBody className="relative z-10 py-6 px-5 sm:py-8 sm:px-7">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target size={16} className={positive ? "text-sky-400" : "text-rose-400"} />
                <p className="text-white/60 font-semibold text-xs tracking-[0.2em] uppercase">
                  Balance planeado · {monthLabel(month).split(" de ")[0]}
                </p>
              </div>
              <span className="text-[10px] font-bold tracking-widest text-white/40 border border-white/15 rounded-md px-2 py-0.5">MXN</span>
            </div>
            <h2 className={`text-5xl sm:text-7xl font-black tracking-tighter mb-2 tnum ${positive ? "neon-number" : "neon-number-negative"}`}>
              {!positive && "−"}{p.int}
              {!p.masked && p.cents && <span className="text-2xl sm:text-4xl font-bold text-white/35">{p.cents}</span>}
            </h2>
            <div className="flex gap-2 flex-wrap mb-3">
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tnum border bg-emerald-400/10 border-emerald-400/25 text-emerald-300">
                <TrendingUp size={11} /> +{money(plan.income)} entra
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tnum border bg-rose-400/10 border-rose-400/25 text-rose-300">
                <TrendingDown size={11} /> −{money(plan.outflow)} sale
              </span>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tnum bg-white/8 border border-white/15 text-white/60">
                {plan.committedPct === null ? "sin ingresos aún" : `${plan.committedPct}% comprometido`}
              </span>
            </div>
            <p className="text-white/70 text-sm tnum mb-5">
              Si cierras {monthLabel(currentMonth).split(" de ")[0]} con <span className="text-white font-bold">{money(startBalance)}</span>,
              terminarías {monthLabel(month).split(" de ")[0]} con{" "}
              <span className={`font-bold ${closing >= 0 ? "text-white" : "text-rose-300"}`}>{closing < 0 && "−"}{money(Math.abs(closing))}</span>.
            </p>
            <div>
              <div className="flex justify-between text-xs text-white/50 mb-1.5">
                <span>Salidas vs ingresos esperados</span>
                <span className="tnum text-white/70">{plan.committedPct === null ? "—" : `${plan.committedPct}%`}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10">
                <div className={`h-full rounded-full transition-all duration-700 ${positive ? "bg-gradient-to-r from-blue-400 to-sky-300" : "bg-gradient-to-r from-rose-400 to-orange-400"}`}
                  style={{ width: `${Math.min(100, plan.committedPct ?? 0)}%` }} />
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="col-span-1 md:col-span-4 grid grid-cols-3 md:flex md:flex-col gap-2 md:gap-3">
          {[
            { label: "Ingresos esp.", value: plan.income, icon: <TrendingUp size={20} />, cls: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" },
            { label: "Compromisos", value: plan.commitments, icon: <Layers size={20} />, cls: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-400" },
            { label: "Planeados", value: plan.planned, icon: <ReceiptText size={20} />, cls: "bg-cyan-500/12 text-cyan-600 dark:text-cyan-400" },
          ].map((t) => (
            <Card key={t.label} className="glass card-hover border-0 rounded-2xl md:rounded-3xl">
              <CardBody className="flex flex-col md:flex-row md:justify-between items-start md:items-center p-3 md:p-5 gap-2 md:gap-0">
                <div className={`p-1.5 md:p-3 rounded-lg md:rounded-2xl shrink-0 md:order-2 [&_svg]:w-4 [&_svg]:h-4 md:[&_svg]:w-5 md:[&_svg]:h-5 ${t.cls}`}>{t.icon}</div>
                <div className="min-w-0 md:order-1 w-full">
                  <p className="text-default-500 text-[9px] md:text-[11px] font-bold uppercase tracking-wider mb-0.5 md:mb-1 truncate">{t.label}</p>
                  <p className="text-sm sm:text-base md:text-2xl font-extrabold tnum tracking-tight text-foreground truncate">{money(t.value)}</p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>

      {/* Secciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

        {/* Ingresos esperados */}
        <Card className="glass card-hover border border-emerald-500/20">
          <CardBody className="p-5 flex flex-col gap-3">
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/12"><TrendingUp size={16} className="text-emerald-500" /></div>
                <div>
                  <h3 className="text-sm font-bold">Ingresos esperados</h3>
                  <p className="text-[11px] text-default-400">Lo que sabes que va a entrar</p>
                </div>
              </div>
              <span className="text-lg font-extrabold tnum text-emerald-500">{money(plan.income)}</span>
            </div>
            {plan.incomeItems.length === 0 ? (
              <p className="text-xs text-default-400 py-3 text-center border-2 border-dashed border-default-200/60 rounded-xl">Aún no has planeado ingresos para este mes</p>
            ) : (
              <div className="space-y-1.5">{plan.incomeItems.map((t) => renderTx(t, "income"))}</div>
            )}
            {openForm === "income" ? renderForm("income") : (
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" color="success" variant="shadow" className="font-bold text-white" startContent={<Plus size={14} />} onPress={() => openAdd("income")}>Ingreso</Button>
                {prevIncomeCount > 0 && (
                  <Button size="sm" variant="flat" className="font-bold" startContent={<Copy size={13} />} onPress={() => copyFromPrev("income")}>
                    Copiar de {monthLabel(prevMonth).split(" de ")[0]}
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Compromisos fijos */}
        <Card className="glass card-hover border border-indigo-500/20">
          <CardBody className="p-5 flex flex-col gap-3">
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/12"><Layers size={16} className="text-indigo-500" /></div>
                <div>
                  <h3 className="text-sm font-bold">Compromisos fijos</h3>
                  <p className="text-[11px] text-default-400">Se calculan solos: fijos + mensualidades MSI</p>
                </div>
              </div>
              <span className="text-lg font-extrabold tnum text-rose-500">{money(plan.commitments)}</span>
            </div>
            {plan.fixedItems.length === 0 && plan.msiItems.length === 0 ? (
              <p className="text-xs text-default-400 py-3 text-center border-2 border-dashed border-default-200/60 rounded-xl">Sin gastos fijos ni compras a meses activas</p>
            ) : (
              <div className="space-y-1.5">
                {plan.fixedItems.map(({ sub, amount, note }) => (
                  <div key={sub.id} className="flex justify-between items-center gap-2 p-2.5 rounded-xl bg-rose-500/10">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-default-700 truncate flex items-center gap-1.5">
                        {sub.label}
                        <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-500 flex items-center gap-0.5"><Repeat size={8} /> fijo</span>
                      </p>
                      <p className="text-[10px] text-default-400">{sub.category || "Suscripción"} · {sub.billingCycle}{note && ` · ${note}`}</p>
                    </div>
                    <span className="tnum font-bold text-sm text-default-700 shrink-0">−{moneySmart(amount)}</span>
                  </div>
                ))}
                {plan.msiItems.map(({ status: s, card }) => (
                  <div key={s.plan.id} className="p-2.5 rounded-xl bg-indigo-500/10 space-y-1.5">
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-sm font-semibold text-default-700 truncate">
                        {card?.label ? `${card.label} · ` : ""}{s.plan.label}
                      </p>
                      <span className="tnum font-bold text-sm text-indigo-500 shrink-0">
                        −{money(s.monthlyPayment)}<span className="text-default-400 font-normal text-[10px]">/mes</span>
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-default-200/60 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-400" style={{ width: `${s.progress}%` }} />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-default-400 tnum">
                      {onUpdateInstallment && (
                        <span className="flex items-center gap-0.5">
                          <button onClick={() => onUpdateInstallment(s.plan.id, { paidAdjust: (s.plan.paidAdjust || 0) - 1 })}
                            disabled={s.monthsPaid <= 0}
                            className="w-5 h-5 rounded-md bg-default-200/70 text-default-600 hover:bg-default-300 disabled:opacity-30 flex items-center justify-center" aria-label="Una mensualidad menos"><Minus size={10} /></button>
                          <button onClick={() => onUpdateInstallment(s.plan.id, { paidAdjust: (s.plan.paidAdjust || 0) + 1 })}
                            disabled={s.monthsPaid >= s.plan.months}
                            className="w-5 h-5 rounded-md bg-default-200/70 text-default-600 hover:bg-indigo-500/30 disabled:opacity-30 flex items-center justify-center" aria-label="Una mensualidad más"><Plus size={10} /></button>
                        </span>
                      )}
                      <span><span className="font-bold text-default-600">{s.monthsPaid}/{s.plan.months}</span> pagadas al cerrar {monthLabel(month).split(" de ")[0]} · restan {money(s.remainingAmount)}</span>
                      {!!s.plan.paidAdjust && <span className="text-[9px] font-bold uppercase text-indigo-500">{s.plan.paidAdjust > 0 ? "+" : ""}{s.plan.paidAdjust} ajustado</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Gastos planeados */}
        <Card className="glass card-hover border border-cyan-500/20">
          <CardBody className="p-5 flex flex-col gap-3">
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/12"><ReceiptText size={16} className="text-cyan-500" /></div>
                <div>
                  <h3 className="text-sm font-bold">Gastos planeados</h3>
                  <p className="text-[11px] text-default-400">Lo que ya sabes que vas a gastar</p>
                </div>
              </div>
              <span className="text-lg font-extrabold tnum text-rose-500">{money(plan.planned)}</span>
            </div>
            {plan.plannedItems.length === 0 ? (
              <p className="text-xs text-default-400 py-3 text-center border-2 border-dashed border-default-200/60 rounded-xl">Aún no hay gastos planeados para este mes</p>
            ) : (
              <div className="space-y-1.5">{plan.plannedItems.map((t) => renderTx(t, "expense"))}</div>
            )}
            {openForm === "expense" ? renderForm("expense") : (
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" color="primary" variant="shadow" className="font-bold" startContent={<Plus size={14} />} onPress={() => openAdd("expense")}>
                  Gasto de {monthLabel(month).split(" de ")[0]}
                </Button>
                {prevExpenseCount > 0 && (
                  <Button size="sm" variant="flat" className="font-bold" startContent={<Copy size={13} />} onPress={() => copyFromPrev("expense")}>
                    Copiar gastos de {monthLabel(prevMonth).split(" de ")[0]}
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Tarjetas en el mes */}
        <Card className="glass card-hover border border-default-200/60">
          <CardBody className="p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-default-200/60"><CreditCardIcon size={16} className="text-default-500" /></div>
              <div>
                <h3 className="text-sm font-bold">Tarjetas en {monthLabel(month).split(" de ")[0]}</h3>
                <p className="text-[11px] text-default-400">Mensualidades que caen y su fecha de pago</p>
              </div>
            </div>
            {plan.cards.length === 0 ? (
              <p className="text-xs text-default-400 py-3 text-center border-2 border-dashed border-default-200/60 rounded-xl">Ninguna tarjeta tiene mensualidades en este mes</p>
            ) : (
              <div className="space-y-1.5">
                {plan.cards.map((pc) => (
                  <div key={pc.card.id} className="flex justify-between items-center gap-2 p-2.5 rounded-xl bg-default-100/70">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-default-700 truncate">{pc.card.label}</p>
                      <p className="text-[10px] text-default-400">
                        Pago {pc.dueDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} · {pc.plans} compra{pc.plans !== 1 && "s"} a meses
                      </p>
                    </div>
                    <span className="tnum font-bold text-sm text-default-700 shrink-0">{money(pc.msi)}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-default-400">Lo que gastes con tarjeta durante el mes se suma aquí cuando lo registres en Gastos & Deudas.</p>
          </CardBody>
        </Card>
      </div>

      {/* Línea de tiempo del mes */}
      {timeline.length > 0 && (
        <Card className="glass card-hover border border-cyan-500/20">
          <CardBody className="p-5">
            <div className="flex items-center gap-2.5 mb-1">
              <div className="p-2 rounded-xl bg-cyan-500/12"><CalendarRange size={16} className="text-cyan-500" /></div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">Cómo queda tu dinero en {monthLabel(month).split(" de ")[0]}</h3>
                <p className="text-[11px] text-default-400">
                  Arrancas con <span className="font-bold tnum text-default-600">{money(startBalance)}</span>; así queda tu saldo después de cada movimiento
                </p>
              </div>
            </div>
            {firstNegative && (
              <div className="mt-2 mb-1 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                <p className="text-[11px] text-default-600">
                  Te quedarías en negativo el <span className="font-bold">{firstNegative.date.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</span> con <span className="font-bold">{firstNegative.label}</span>.
                </p>
              </div>
            )}
            <div className="mt-3 relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-default-200/60" />
              <div className="space-y-2.5">
                {timeline.map((r) => {
                  const neg = r.after < 0;
                  const inc = r.amount > 0;
                  return (
                    <div key={r.id} className="flex items-center gap-2 sm:gap-3 relative">
                      <span className={`w-[15px] h-[15px] rounded-full border-2 shrink-0 z-10 ${neg ? "bg-rose-500 border-rose-300/50" : inc ? "bg-emerald-500 border-emerald-300/50" : "bg-default-100 border-default-300"}`} />
                      <div className="w-[56px] sm:w-[74px] shrink-0">
                        <p className="text-[11px] font-bold text-default-600 capitalize leading-tight">{r.date.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</p>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3">
                        <div className="flex items-center gap-1.5 min-w-0 sm:flex-1">
                          {r.kind === "income" ? <TrendingUp size={12} className="text-emerald-500 shrink-0" />
                            : r.kind === "planned" ? <ReceiptText size={12} className="text-cyan-500 shrink-0" />
                            : r.kind === "msi" ? <CreditCardIcon size={12} className="text-indigo-500 shrink-0" />
                            : <Repeat size={12} className="text-default-400 shrink-0" />}
                          <span className="text-xs font-semibold text-default-700 truncate">{r.label}</span>
                          {r.note && <span className={`text-[8px] font-bold uppercase shrink-0 ${r.kind === "msi" ? "text-indigo-500" : "text-default-400"}`}>{r.note}</span>}
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0">
                          <span className={`tnum text-xs font-bold whitespace-nowrap ${inc ? "text-emerald-500" : "text-rose-500"}`}>{inc ? "+" : "−"}{money(Math.abs(r.amount))}</span>
                          <span className={`tnum text-xs font-black whitespace-nowrap sm:w-[86px] text-right ${neg ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"}`}>{neg && "−"}{money(Math.abs(r.after))}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className={`mt-3 text-[11px] font-semibold ${closing < 0 ? "text-rose-500" : "text-default-400"}`}>
              {closing < 0
                ? `Cerrarías ${monthLabel(month).split(" de ")[0]} en negativo — planea más ingresos o recorta gastos.`
                : `Cierras ${monthLabel(month).split(" de ")[0]} con ${money(closing)}.`}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
