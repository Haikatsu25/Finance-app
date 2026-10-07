"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, Input, Button, Select, SelectItem } from "@heroui/react";
import { StatCard } from "./dashboard/StatCard";
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Layers, ReceiptText,
  Plus, Trash2, Copy, Repeat, CreditCard as CreditCardIcon, Minus, Check,
  CalendarRange, AlertTriangle, Landmark, Target,
} from "lucide-react";
import { TransactionItem, SubscriptionItem, InstallmentPlan, CreditCardItem, FinanceItem } from "@/types";
import { money, moneySmart, moneyParts, round2 } from "@/lib/format";
import { planMonth, monthKey, shiftMonth, monthLabel, todayIso as todayLocal } from "@/lib/finance-utils";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "./Transactions";
import AddedByBadge from "./AddedByBadge";

// ─────────────────────────────────────────────────────────────────
// PLAN DEL MES — la cara "futura" de Inicio. Misma jerarquía visual
// (losa del saldo, tres cifras, secciones) pero con lo que ya sabes de un
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
  const todayIso = todayLocal();
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

  const mw = (key: string) => monthLabel(key).split(" de ")[0];

  // Botones de icono a 44px; los de +/- de mensualidades a 36px
  const ICON_BTN = "w-11 h-11 grid place-items-center rounded-lg text-default-500 transition-colors hover:bg-foreground/10";
  const STEP_BTN = "w-9 h-9 rounded-lg border border-default-300 hover:bg-foreground/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center justify-center";
  const ACTION_BTN = "h-11 px-3.5 rounded-lg border-2 border-foreground text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors hover:bg-foreground/10";
  const EMPTY = "text-xs text-default-600 py-4 text-center border-2 border-dashed border-default-300 rounded-lg";

  // Funciones de render (no componentes): si fueran componentes internos se
  // remontarían en cada tecleo y los inputs perderían el foco.
  const renderTx = (t: TransactionItem, tone: "income" | "expense") => {
    const isInc = tone === "income";
    const acct = t.accountId ? accounts.find((a) => a.id === t.accountId) : undefined;
    return (
      <div key={t.id} className="group py-2.5 border-b border-default-200 last:border-b-0">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate flex items-center gap-1.5">
              {t.label}
              {t.accountId && (
                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold shrink-0">
                  <Check size={12} aria-hidden /> pagado
                </span>
              )}
            </p>
            <p className="text-[11px] text-default-600 flex items-center gap-x-2 gap-y-0.5 flex-wrap">
              <span>{t.category || "Sin categoría"}</span>
              <span className="tnum">{new Date(t.date + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</span>
              {acct && (
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Landmark size={11} aria-hidden /> {acct.label}
                </span>
              )}
              <AddedByBadge addedBy={t.addedBy} viewerId={viewerId} />
            </p>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 -mr-2.5 -mt-1.5">
            <span className={`figure text-[1.35rem] mr-1 ${isInc ? "text-money-in-text" : ""}`}>
              {isInc ? "+" : "−"}{moneySmart(t.amount)}
            </span>
            <button
              onClick={() => onRemoveTransaction(t.id)}
              className={`${ICON_BTN} opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 hover:text-money-out-text`}
              aria-label={`Eliminar ${t.label}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        {canMarkPaid(t) && payingId !== t.id && (
          <button
            onClick={() => setPayingId(t.id)}
            className={`${ACTION_BTN} mt-1.5`}
            title="Ya lo pagué: asigna la cuenta de la que salió"
          >
            <Check size={14} aria-hidden /> Ya {isInc ? "llegó" : "pagué"}
          </button>
        )}
        {payingId === t.id && (
          <div className="flex items-center gap-1.5 mt-2">
            <Select size="md" variant="bordered" aria-label="¿De qué cuenta salió?" className="w-52"
              startContent={<Landmark size={14} className="text-default-500" />}
              onChange={(e) => {
                if (e.target.value && onUpdateTransaction) {
                  onUpdateTransaction(t.id, { accountId: e.target.value });
                  setPayingId(null);
                }
              }}>
              {accounts.map((a) => <SelectItem key={a.id} textValue={a.label}>{a.label}</SelectItem>)}
            </Select>
            <Button variant="light" className="h-11 min-w-11 px-3 text-default-600 font-semibold" onPress={() => setPayingId(null)}>Cancelar</Button>
          </div>
        )}
      </div>
    );
  };

  const renderForm = (type: "income" | "expense") => (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-default-100 border border-default-200">
      <Input placeholder={type === "income" ? "¿De dónde? (ej. Nómina)" : "¿En qué? (ej. Súper)"} aria-label="Descripción" size="md" variant="bordered" value={fLabel} onValueChange={setFLabel} autoFocus />
      <div className="flex gap-2 flex-wrap">
        <Input type="number" min="0" step="0.01" inputMode="decimal" placeholder="0.00" aria-label="Monto" size="md" variant="bordered"
          startContent={<span className="text-default-500 text-xs font-bold">$</span>}
          className="w-32" value={fAmount} onValueChange={setFAmount}
          onKeyDown={(e) => { if (e.key === "Enter") submitAdd(); }} />
        <Input type="date" size="md" variant="bordered" aria-label="Fecha" className="w-[160px]" value={fDate} onValueChange={setFDate} />
        <Select size="md" variant="bordered" aria-label="Categoría" className="w-40"
          selectedKeys={fCat ? [fCat] : []} onChange={(e) => setFCat(e.target.value || "Otros")}>
          {(type === "income" ? incomeCats : expenseCats).map((c) => <SelectItem key={c}>{c}</SelectItem>)}
        </Select>
      </div>
      <div className="flex gap-2">
        <Button color="primary" variant="solid" className="font-bold h-11"
          isDisabled={!fValid} startContent={<Plus size={16} />} onPress={submitAdd}>
          Agregar a {cap(mw(month))}
        </Button>
        <Button variant="light" className="h-11 text-default-600 font-semibold" onPress={() => setOpenForm(null)}>Cancelar</Button>
      </div>
    </div>
  );

  // Encabezado de sección: título con su ícono, descripción y el total del flujo
  const sectionHead = (icon: React.ReactNode, title: string, desc: string, total?: React.ReactNode) => (
    <div className="flex justify-between items-start gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-bold flex items-center gap-2">{icon}{title}</h3>
        <p className="text-xs text-default-600 mt-0.5">{desc}</p>
      </div>
      {total}
    </div>
  );

  const progressLabel = plan.committedPct === null ? "Sin dato" : `${plan.committedPct}%`;

  return (
    <div className="space-y-4" id="plan-view">
      {/* Navegación de mes: mismo patrón que Movimientos */}
      <div className="flex items-stretch justify-between rounded-[10px] border-2 border-foreground overflow-hidden">
        <button onClick={() => onMonthChange(shiftMonth(month, -1))} disabled={month <= minMonth}
          className="px-3.5 min-h-11 hover:bg-foreground/10 text-foreground disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Mes anterior">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center py-1.5 self-center">
          <p className="text-sm font-black">{cap(monthLabel(month))}</p>
          <p className="text-xs text-default-600 font-semibold">
            Planeando. {daysToStart > 1 ? `Empieza en ${daysToStart} días` : daysToStart === 1 ? "Empieza mañana" : "Ya empezó"}
          </p>
        </div>
        <button onClick={() => onMonthChange(shiftMonth(month, 1))} disabled={month >= maxMonth}
          className="px-3.5 min-h-11 hover:bg-foreground/10 text-foreground disabled:opacity-30 disabled:hover:bg-transparent" aria-label="Mes siguiente">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Losa del saldo planeado + tres cifras: misma jerarquía que Inicio */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <section className="hero-slab col-span-1 md:col-span-8 flex flex-col" data-state={positive ? "in" : "out"} aria-labelledby="plan-balance-label">
          <div className="flex items-start justify-between gap-3">
            <p id="plan-balance-label" className="text-base font-bold flex items-center gap-2">
              <Target size={16} aria-hidden /> Balance planeado de {mw(month)}
            </p>
            <span className="text-xs font-bold border-2 border-current rounded-md px-1.5 py-0.5" aria-label="Pesos mexicanos">MXN</span>
          </div>
          <h2 className="figure figure-xl tnum mt-3 sm:mt-4 mb-4 sm:mb-5">
            {!positive && "−"}{p.int}
            {!p.masked && p.cents && <span className="text-[0.4em] align-top ml-1 inline-block pt-[0.18em]">{p.cents}</span>}
          </h2>
          <div className="flex gap-x-5 gap-y-1 flex-wrap text-sm font-semibold tnum">
            <span className="inline-flex items-center gap-1.5"><TrendingUp size={14} aria-hidden /> Entran {money(plan.income)}</span>
            <span className="inline-flex items-center gap-1.5"><TrendingDown size={14} aria-hidden /> Salen {money(plan.outflow)}</span>
            <span>{plan.committedPct === null ? "Sin ingresos aún" : `${plan.committedPct}% comprometido`}</span>
          </div>
          <p className="text-sm font-medium tnum mt-3 max-w-[52ch]">
            Si cierras {mw(currentMonth)} con <span className="font-bold">{money(startBalance)}</span>,
            terminarías {mw(month)} con{" "}
            <span className="font-bold">{closing < 0 && "−"}{money(Math.abs(closing))}</span>.
          </p>
          <div className="mt-5">
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span>Salidas frente a ingresos esperados</span>
              <span className="tnum">{progressLabel}</span>
            </div>
            <div className="h-2.5 rounded-sm overflow-hidden" style={{ background: "color-mix(in srgb, var(--slab-fg) 25%, transparent)" }}>
              <div className="h-full rounded-sm transition-all duration-700"
                style={{ width: `${Math.min(100, plan.committedPct ?? 0)}%`, background: "var(--slab-fg)" }} />
            </div>
          </div>
        </section>

        <div className="col-span-1 md:col-span-4 grid grid-cols-3 md:flex md:flex-col gap-2 md:gap-3">
          <StatCard label="Ingresos" value={plan.income} tone="emerald" />
          <StatCard label="Compromisos" value={plan.commitments} tone="rose" />
          <StatCard label="Planeados" value={plan.planned} tone="rose" />
        </div>
      </div>

      {/* Secciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

        {/* Ingresos esperados */}
        <Card className="glass card-hover rule-in shadow-none">
          <CardBody className="p-5 flex flex-col gap-3">
            {sectionHead(
              <TrendingUp size={16} className="text-money-in-text shrink-0" aria-hidden />,
              "Ingresos esperados", "Lo que sabes que va a entrar",
              <span className="figure text-[1.65rem] shrink-0 text-money-in-text">{money(plan.income)}</span>,
            )}
            {plan.incomeItems.length === 0 ? (
              <p className={EMPTY}>Aún no has planeado ingresos para este mes</p>
            ) : (
              <div>{plan.incomeItems.map((t) => renderTx(t, "income"))}</div>
            )}
            {openForm === "income" ? renderForm("income") : (
              <div className="flex gap-2 flex-wrap">
                <Button color="primary" variant="solid" className="font-bold h-11" startContent={<Plus size={16} />} onPress={() => openAdd("income")}>Ingreso</Button>
                {prevIncomeCount > 0 && (
                  <Button variant="bordered" className="font-bold h-11 border-2 border-foreground" startContent={<Copy size={14} />} onPress={() => copyFromPrev("income")}>
                    Copiar de {mw(prevMonth)}
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Compromisos fijos */}
        <Card className="glass card-hover rule-out shadow-none">
          <CardBody className="p-5 flex flex-col gap-3">
            {sectionHead(
              <Layers size={16} className="text-money-out-text shrink-0" aria-hidden />,
              "Compromisos fijos", "Se calculan solos: fijos y mensualidades MSI",
              <span className="figure text-[1.65rem] shrink-0 text-money-out-text">{money(plan.commitments)}</span>,
            )}
            {plan.fixedItems.length === 0 && plan.msiItems.length === 0 ? (
              <p className={EMPTY}>Sin gastos fijos ni compras a meses activas</p>
            ) : (
              <div>
                {plan.fixedItems.map(({ sub, amount, note }) => (
                  <div key={sub.id} className="flex justify-between items-center gap-2 py-2.5 border-b border-default-200 last:border-b-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate flex items-center gap-1.5">
                        {sub.label}
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-default-600 shrink-0"><Repeat size={11} aria-hidden /> fijo</span>
                      </p>
                      <p className="text-[11px] text-default-600">{sub.category || "Suscripción"}, {sub.billingCycle}{note && `, ${note}`}</p>
                    </div>
                    <span className="figure text-[1.35rem] shrink-0">−{moneySmart(amount)}</span>
                  </div>
                ))}
                {plan.msiItems.map(({ status: s, card }) => (
                  <div key={s.plan.id} className="py-2.5 border-b border-default-200 last:border-b-0 space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <p className="text-sm font-semibold truncate">
                        {card?.label ? `${card.label}: ` : ""}{s.plan.label}
                      </p>
                      <span className="figure text-[1.35rem] shrink-0">
                        −{money(s.monthlyPayment)}<span className="text-default-600 font-normal text-xs font-sans" style={{ fontStretch: "100%", fontVariationSettings: '"wdth" 100' }}> al mes</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-sm bg-default-200 overflow-hidden">
                      <div className="h-full rounded-sm bg-foreground" style={{ width: `${s.progress}%` }} />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-default-600 tnum">
                      {onUpdateInstallment && (
                        <span className="flex items-center gap-1">
                          <button onClick={() => onUpdateInstallment(s.plan.id, { paidAdjust: (s.plan.paidAdjust || 0) - 1 })}
                            disabled={s.monthsPaid <= 0}
                            className={STEP_BTN} aria-label="Una mensualidad menos"><Minus size={14} /></button>
                          <button onClick={() => onUpdateInstallment(s.plan.id, { paidAdjust: (s.plan.paidAdjust || 0) + 1 })}
                            disabled={s.monthsPaid >= s.plan.months}
                            className={STEP_BTN} aria-label="Una mensualidad más"><Plus size={14} /></button>
                        </span>
                      )}
                      <span><span className="font-bold text-foreground">{s.monthsPaid} de {s.plan.months}</span> pagadas al cerrar {mw(month)}. Restan {money(s.remainingAmount)}</span>
                      {!!s.plan.paidAdjust && <span className="font-bold text-foreground">{s.plan.paidAdjust > 0 ? "+" : ""}{s.plan.paidAdjust} ajustada</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Gastos planeados */}
        <Card className="glass card-hover rule-out shadow-none">
          <CardBody className="p-5 flex flex-col gap-3">
            {sectionHead(
              <ReceiptText size={16} className="text-money-out-text shrink-0" aria-hidden />,
              "Gastos planeados", "Lo que ya sabes que vas a gastar",
              <span className="figure text-[1.65rem] shrink-0 text-money-out-text">{money(plan.planned)}</span>,
            )}
            {plan.plannedItems.length === 0 ? (
              <p className={EMPTY}>Aún no hay gastos planeados para este mes</p>
            ) : (
              <div>{plan.plannedItems.map((t) => renderTx(t, "expense"))}</div>
            )}
            {openForm === "expense" ? renderForm("expense") : (
              <div className="flex gap-2 flex-wrap">
                <Button color="primary" variant="solid" className="font-bold h-11" startContent={<Plus size={16} />} onPress={() => openAdd("expense")}>
                  Gasto de {mw(month)}
                </Button>
                {prevExpenseCount > 0 && (
                  <Button variant="bordered" className="font-bold h-11 border-2 border-foreground" startContent={<Copy size={14} />} onPress={() => copyFromPrev("expense")}>
                    Copiar gastos de {mw(prevMonth)}
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Tarjetas en el mes */}
        <Card className="glass card-hover rule-ink shadow-none">
          <CardBody className="p-5 flex flex-col gap-3">
            {sectionHead(
              <CreditCardIcon size={16} className="shrink-0" aria-hidden />,
              `Tarjetas en ${mw(month)}`, "Mensualidades que caen y su fecha de pago",
            )}
            {plan.cards.length === 0 ? (
              <p className={EMPTY}>Ninguna tarjeta tiene mensualidades en este mes</p>
            ) : (
              <div>
                {plan.cards.map((pc) => (
                  <div key={pc.card.id} className="flex justify-between items-center gap-2 py-2.5 border-b border-default-200 last:border-b-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{pc.card.label}</p>
                      <p className="text-[11px] text-default-600">
                        Pago el {pc.dueDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}, {pc.plans} compra{pc.plans !== 1 && "s"} a meses
                      </p>
                    </div>
                    <span className="figure text-[1.35rem] shrink-0">{money(pc.msi)}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-default-600">Lo que gastes con tarjeta durante el mes se suma aquí cuando lo registres en Gastos & Deudas.</p>
          </CardBody>
        </Card>
      </div>

      {/* Línea de tiempo del mes */}
      {timeline.length > 0 && (
        <Card className="glass card-hover rule-ink shadow-none">
          <CardBody className="p-5">
            <div className="mb-1">
              <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
                <CalendarRange size={16} className="shrink-0" aria-hidden />
                Cómo queda tu dinero en {mw(month)}
              </h3>
              <p className="text-xs text-default-600 mt-0.5">
                Arrancas con <span className="font-bold tnum text-foreground">{money(startBalance)}</span>; así queda tu saldo después de cada movimiento
              </p>
            </div>
            {firstNegative && (
              <div className="mt-2 mb-1 p-3 rounded-lg bg-money-out/10 border border-money-out/30 flex items-start gap-2">
                <AlertTriangle size={14} className="text-money-out-text shrink-0 mt-0.5" aria-hidden />
                <p className="text-xs text-default-700">
                  Te quedarías en negativo el <span className="font-bold">{firstNegative.date.toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</span> con <span className="font-bold">{firstNegative.label}</span>.
                </p>
              </div>
            )}
            <div className="mt-3 relative">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-default-300" aria-hidden />
              <ol className="space-y-3">
                {timeline.map((r) => {
                  const neg = r.after < 0;
                  const inc = r.amount > 0;
                  return (
                    <li key={r.id} className="flex items-center gap-2 sm:gap-3 relative">
                      <span className={`w-[15px] h-[15px] rounded-full border-2 shrink-0 z-10 ${neg ? "bg-money-out border-money-out" : inc ? "bg-money-in border-money-in" : "bg-background border-default-400"}`} aria-hidden />
                      <div className="w-[58px] sm:w-[78px] shrink-0">
                        <p className="text-xs font-bold leading-tight">{r.date.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}</p>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3">
                        <div className="flex items-center gap-1.5 min-w-0 sm:flex-1">
                          {r.kind === "income" ? <TrendingUp size={13} className="text-money-in-text shrink-0" aria-hidden />
                            : r.kind === "planned" ? <ReceiptText size={13} className="text-default-600 shrink-0" aria-hidden />
                            : r.kind === "msi" ? <CreditCardIcon size={13} className="text-default-600 shrink-0" aria-hidden />
                            : <Repeat size={13} className="text-default-600 shrink-0" aria-hidden />}
                          <span className="text-sm font-semibold truncate">{r.label}</span>
                          {r.note && <span className="text-[11px] text-default-600 shrink-0">({r.note})</span>}
                        </div>
                        <div className="flex items-baseline justify-between sm:justify-end gap-2 sm:gap-4 shrink-0">
                          <span className={`figure text-[1.15rem] whitespace-nowrap ${inc ? "text-money-in-text" : ""}`}>{inc ? "+" : "−"}{money(Math.abs(r.amount))}</span>
                          <span className={`figure text-[1.3rem] whitespace-nowrap sm:w-[96px] text-right ${neg ? "text-money-out-text" : ""}`}>{neg && "−"}{money(Math.abs(r.after))}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
            <p className={`mt-4 text-xs font-semibold ${closing < 0 ? "text-money-out-text" : "text-default-600"}`}>
              {closing < 0
                ? `Cerrarías ${mw(month)} en negativo: planea más ingresos o recorta gastos.`
                : `Cierras ${mw(month)} con ${money(closing)}.`}
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
