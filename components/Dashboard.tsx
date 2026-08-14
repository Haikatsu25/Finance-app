"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Divider,
  Chip,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Calendar as CalendarWidget,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import {
  Plus,
  Trash2,
  Save,
  Wallet,
  ShieldAlert,
  PiggyBank,
  DollarSign,
  TrendingDown,
  TrendingUp,
  History,
  HelpCircle,
  Calendar,
  Target,
  BarChart2,
  Brain,
  LayoutDashboard,
  X,
  ChevronRight,
  Download,
  Upload,
  Database,
  Undo2,
  Check,
  CloudUpload,
  AlertTriangle,
  RefreshCw,
  ReceiptText,
  Eye,
  EyeOff,
  Mic,
  Fingerprint,
  Bell,
  BellOff,
  Lock,
  CreditCard,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import {
  FinanceItem, HistorySnapshot, SubscriptionItem, GoalItem,
  TransactionItem, CreditCardItem, BudgetItem, InstallmentPlan,
} from "@/types";
import { UserButton, SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { money, moneyExact, round2, loadPrivacyMode, setPrivacyMode } from "@/lib/format";
import { biometricsAvailable, isLockEnabled, enableLock, disableLock, verifyLock } from "@/lib/applock";
import { pushSupported, getPushStatus, enablePush, disablePush } from "@/lib/push-client";
import Analytics from "./Analytics";
import FinanceAI from "./FinanceAI";
import Transactions from "./Transactions";
import CreditCards from "./CreditCards";
import Budgets from "./Budgets";
import UpcomingPayments from "./UpcomingPayments";
import VoiceAssistant from "./VoiceAssistant";
import { startTour } from "./Tutorial";

// ─────────────────────────────────────────────────────────────────────────────
// TONOS — mapa explícito de clases. Tailwind escanea el código como texto,
// así que las clases deben aparecer COMPLETAS (nunca `bg-${color}-500/10`).
// ─────────────────────────────────────────────────────────────────────────────
type ToneName = "emerald" | "rose" | "amber" | "indigo" | "purple" | "blue";

const TONE: Record<ToneName, {
  text: string; textStrong: string; bg: string; bgBadge: string;
  border: string; iconBg: string;
}> = {
  emerald: { text: "text-emerald-600 dark:text-emerald-400", textStrong: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10", bgBadge: "bg-emerald-500/12", border: "border-emerald-500/20", iconBg: "bg-emerald-500/12" },
  rose:    { text: "text-rose-600 dark:text-rose-400",       textStrong: "text-rose-700 dark:text-rose-300",       bg: "bg-rose-500/10",    bgBadge: "bg-rose-500/12",    border: "border-rose-500/20",    iconBg: "bg-rose-500/12" },
  amber:   { text: "text-amber-600 dark:text-amber-400",     textStrong: "text-amber-700 dark:text-amber-300",     bg: "bg-amber-500/10",   bgBadge: "bg-amber-500/12",   border: "border-amber-500/20",   iconBg: "bg-amber-500/12" },
  indigo:  { text: "text-indigo-600 dark:text-indigo-400",   textStrong: "text-indigo-700 dark:text-indigo-300",   bg: "bg-indigo-500/10",  bgBadge: "bg-indigo-500/12",  border: "border-indigo-500/20",  iconBg: "bg-indigo-500/12" },
  purple:  { text: "text-purple-600 dark:text-purple-400",   textStrong: "text-purple-700 dark:text-purple-300",   bg: "bg-purple-500/10",  bgBadge: "bg-purple-500/12",  border: "border-purple-500/20",  iconBg: "bg-purple-500/12" },
  blue:    { text: "text-blue-600 dark:text-blue-400",       textStrong: "text-blue-700 dark:text-blue-300",       bg: "bg-blue-500/10",    bgBadge: "bg-blue-500/12",    border: "border-blue-500/20",    iconBg: "bg-blue-500/12" },
};

const SECTION_TONE: Record<"success" | "danger" | "warning", ToneName> = {
  success: "emerald",
  danger: "rose",
  warning: "amber",
};

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED COUNTER HOOK
// ─────────────────────────────────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 700) {
  const [value, setValue] = useState(target);
  const rafRef = useRef<number>(0);
  const valueRef = useRef(target);
  valueRef.current = value;

  useEffect(() => {
    const start = performance.now();
    const from = valueRef.current;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(2, -10 * progress); // easeOutExpo
      setValue(from + (target - from) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, tone, delay = 0,
}: {
  label: string; value: number; icon: React.ReactNode; tone: ToneName; delay?: number;
}) {
  const animated = useAnimatedCounter(value);
  const t = TONE[tone];
  return (
    <Card
      className="glass card-hover border-0 animate-fade-in-scale"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardBody className="flex flex-row justify-between items-center p-5">
        <div className="min-w-0">
          <p className="text-default-500 text-[11px] font-bold uppercase tracking-wider mb-1">{label}</p>
          {/* Número en blanco/tinta; el color queda en el icono (estilo Revolut) */}
          <p className="text-2xl font-extrabold tnum tracking-tight text-foreground">
            {money(Math.abs(animated))}
          </p>
        </div>
        <div className={`p-3 ${t.iconBg} rounded-2xl shrink-0`}>
          <div className={t.text}>{icon}</div>
        </div>
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON — carga con forma, nunca pantalla en blanco
// ─────────────────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6" aria-busy="true" aria-label="Cargando tus finanzas">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="col-span-1 md:col-span-8 skeleton h-[280px]" />
        <div className="col-span-1 md:col-span-4 flex flex-col gap-3">
          <div className="skeleton h-[86px]" />
          <div className="skeleton h-[86px]" />
          <div className="skeleton h-[86px]" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="skeleton h-[320px]" />
        <div className="skeleton h-[320px]" />
        <div className="skeleton h-[320px] hidden lg:block" />
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE BOTTOM NAV
// ─────────────────────────────────────────────────────────────────────────────
type NavTab = "dashboard" | "transactions" | "analytics" | "ai" | "history";

function BottomNav({ active, onChange }: { active: NavTab; onChange: (t: NavTab) => void }) {
  const tabs: { id: NavTab; icon: React.ReactNode; label: string }[] = [
    { id: "dashboard",    icon: <LayoutDashboard size={20} />, label: "Inicio" },
    { id: "transactions", icon: <ReceiptText size={20} />,     label: "Movs" },
    { id: "analytics",    icon: <BarChart2 size={20} />,       label: "Análisis" },
    { id: "ai",           icon: <Brain size={20} />,            label: "IA" },
    { id: "history",      icon: <History size={20} />,          label: "Historial" },
  ];

  return (
    <nav className="bottom-nav md:hidden" aria-label="Navegación principal">
      <div className="flex justify-around py-2">
        {tabs.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`relative flex flex-col items-center gap-1 px-3 py-1.5 min-w-[56px] rounded-xl transition-all duration-200 ${
                isActive ? "text-emerald-600 dark:text-emerald-400" : "text-default-400 hover:text-default-600"
              }`}
              aria-label={t.label}
              aria-current={isActive ? "page" : undefined}
            >
              {t.icon}
              <span className="text-[10px] font-semibold">{t.label}</span>
              {isActive && <span className="absolute -bottom-0.5 w-6 h-0.5 rounded-full bg-emerald-500" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION — captura de activos / gastos / apartados
// ─────────────────────────────────────────────────────────────────────────────
function Section({ title, description, icon, items, total, color, categories, onAdd, onRemove, cards, onAddToCard }: {
  title: string; description: string; icon: React.ReactNode;
  items: FinanceItem[]; total: number;
  color: "success" | "danger" | "warning"; categories: string[];
  onAdd: (label: string, amount: string, date: string, category: string) => void;
  onRemove: (id: string) => void;
  /** Solo para la sección de gastos: permite cargar el gasto a una tarjeta */
  cards?: CreditCardItem[];
  onAddToCard?: (cardId: string, label: string, amount: number, date: string, category: string) => void;
}) {
  const [label, setLabel]       = useState("");
  const [amount, setAmount]     = useState("");
  const [date, setDate]         = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [payWith, setPayWith]   = useState("cash"); // "cash" | id de tarjeta
  const [lastCharge, setLastCharge] = useState<string | null>(null);

  const t = TONE[SECTION_TONE[color]];
  const amountValid = amount !== "" && Number.isFinite(parseFloat(amount)) && parseFloat(amount) > 0;

  const hasCards = !!cards?.length && !!onAddToCard;
  const selectedCard = hasCards && payWith !== "cash" ? cards!.find((c) => c.id === payWith) : undefined;

  const handleAdd = () => {
    if (!label.trim() || !amountValid) return;
    const parsed = round2(parseFloat(amount));

    if (selectedCard && onAddToCard) {
      // Va directo a la deuda de la tarjeta (y queda en Movimientos)
      onAddToCard(selectedCard.id, label.trim(), parsed, date, category);
      setLastCharge(`${moneyExact(parsed)} → ${selectedCard.label}`);
      setTimeout(() => setLastCharge(null), 3500);
    } else {
      onAdd(label.trim(), amount, date, category);
    }

    setLabel("");
    setAmount("");
    setDate("");
    setCategory(categories[0]);
  };

  return (
    <Card className={`glass card-hover border ${t.border} h-full`}>
      <CardHeader className="flex flex-col items-start px-5 pt-5 pb-0 gap-1">
        <div className={`p-2.5 rounded-xl ${t.iconBg} mb-2`}>
          <div className={t.text}>{icon}</div>
        </div>
        <div className="flex justify-between w-full items-start gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight">{title}</h3>
            <p className="text-xs text-default-400">{description}</p>
          </div>
          <span className={`text-lg tnum font-extrabold shrink-0 ${t.text}`}>
            {moneyExact(total)}
          </span>
        </div>
      </CardHeader>

      <CardBody className="px-5 py-4 flex flex-col gap-3">
        <div className="flex-grow space-y-2 min-h-[80px]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-6 border-2 border-dashed border-default-200/60 rounded-xl text-default-400 gap-1">
              <p className="text-xs font-medium">Sin registros aún</p>
              <p className="text-[11px] text-default-300">Agrega el primero aquí abajo ↓</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`group flex justify-between items-center p-3 rounded-xl ${t.bgBadge} transition-all duration-200 border border-transparent hover:border-default-200 animate-slide-in-left`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-default-700 truncate">{item.label}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.category && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.bg} ${t.text} font-medium`}>
                        {item.category}
                      </span>
                    )}
                    {item.date && <span className="text-[10px] text-default-400">{item.date}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`tnum font-bold text-sm text-right ${t.text}`}>
                    {money(item.amount)}
                  </span>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 text-default-300 hover:text-rose-500 transition-all p-1.5 rounded-lg hover:bg-rose-500/10"
                    aria-label={`Eliminar ${item.label}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Divider className="my-1" />

        <div className="space-y-2.5">
          <Input
            placeholder="Descripción"
            size="sm"
            variant="bordered"
            classNames={{ inputWrapper: "bg-default-50 hover:bg-default-100 border-default-200" }}
            value={label}
            onValueChange={setLabel}
          />

          {/* Selector de tarjeta: el gasto se suma a la deuda de esa tarjeta */}
          {hasCards && (
            <Select
              size="sm"
              variant="bordered"
              aria-label="¿Con qué pagaste?"
              startContent={<CreditCard size={14} className="text-default-400 shrink-0" />}
              classNames={{ trigger: "bg-default-50 hover:bg-default-100 border-default-200" }}
              selectedKeys={[payWith]}
              onChange={(e) => setPayWith(e.target.value || "cash")}
            >
              <>
                <SelectItem key="cash" textValue="Efectivo / débito">Efectivo / débito</SelectItem>
                <>{cards!.map((c) => (
                  <SelectItem key={c.id} textValue={c.label}>{c.label}</SelectItem>
                ))}</>
              </>
            </Select>
          )}

          <Select
            placeholder="Categoría"
            size="sm"
            variant="bordered"
            aria-label="Categoría"
            classNames={{ trigger: "bg-default-50 hover:bg-default-100 border-default-200" }}
            selectedKeys={[category]}
            onChange={(e) => setCategory(e.target.value || categories[0])}
          >
            {categories.map((cat) => (
              <SelectItem key={cat}>{cat}</SelectItem>
            ))}
          </Select>
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              size="sm"
              variant="bordered"
              classNames={{ inputWrapper: "bg-default-50 hover:bg-default-100 border-default-200" }}
              startContent={<span className="text-default-400 text-xs font-bold">$</span>}
              className="flex-1"
              value={amount}
              onValueChange={setAmount}
            />
            <Input
              type="date"
              size="sm"
              variant="bordered"
              aria-label="Fecha"
              classNames={{ inputWrapper: "bg-default-50 hover:bg-default-100 border-default-200" }}
              className="w-[130px]"
              value={date}
              onValueChange={setDate}
            />
          </div>
          <Button
            fullWidth
            color={color}
            variant="shadow"
            onPress={handleAdd}
            className="font-bold text-sm"
            size="sm"
            isDisabled={!label.trim() || !amountValid}
            startContent={<Plus size={15} />}
          >
            {selectedCard ? `Cargar a ${selectedCard.label}` : "Agregar"}
          </Button>

          {selectedCard && (
            <p className="text-[10px] text-default-400 leading-snug">
              Se sumará a la deuda de contado de <span className="font-bold">{selectedCard.label}</span> y quedará
              registrado en Movimientos.
            </p>
          )}

          {lastCharge && (
            <p className="text-[11px] font-bold text-emerald-500 flex items-center gap-1 animate-fade-in-up">
              <Check size={12} /> {lastCharge}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function SubscriptionsSection({ items, total, onAdd, onRemove }: {
  items: SubscriptionItem[]; total: number;
  onAdd: (label: string, amount: string, cycle: "mensual" | "anual", category: string) => void;
  onRemove: (id: string) => void;
}) {
  const [label, setLabel]   = useState("");
  const [amount, setAmount] = useState("");
  const [billingCycle, setBillingCycle] = useState<"mensual" | "anual">("mensual");

  const t = TONE.indigo;
  const amountValid = amount !== "" && Number.isFinite(parseFloat(amount)) && parseFloat(amount) > 0;

  const handleAdd = () => {
    if (!label.trim() || !amountValid) return;
    onAdd(label.trim(), amount, billingCycle, "Suscripción");
    setLabel("");
    setAmount("");
  };

  return (
    <Card className={`glass card-hover border ${t.border} h-full`}>
      <CardHeader className="flex flex-col items-start px-5 pt-5 pb-0 gap-1">
        <div className={`p-2.5 rounded-xl ${t.iconBg} mb-2`}>
          <div className={t.text}><Calendar size={18} /></div>
        </div>
        <div className="flex justify-between w-full items-start gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight">Gastos Fijos</h3>
            <p className="text-xs text-default-400">Suscripciones y cobros recurrentes</p>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-lg tnum font-extrabold ${t.text}`}>
              {moneyExact(total)}
            </span>
            <p className="text-[10px] text-default-400">/ mes (eqv.)</p>
          </div>
        </div>
      </CardHeader>

      <CardBody className="px-5 py-4 flex flex-col gap-3">
        <div className="flex-grow space-y-2 min-h-[80px]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-6 border-2 border-dashed border-default-200/60 rounded-xl text-default-400 gap-1">
              <p className="text-xs font-medium">Sin gastos fijos</p>
              <p className="text-[11px] text-default-300">Netflix, renta, gimnasio…</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`group flex justify-between items-center p-3 rounded-xl ${t.bgBadge} transition-all duration-200 border border-transparent hover:border-default-200 animate-slide-in-left`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-default-700 truncate">{item.label}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.category && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.bg} ${t.text} font-medium`}>
                        {item.category}
                      </span>
                    )}
                    <span className="text-[10px] text-default-400 font-bold uppercase">{item.billingCycle}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`tnum font-bold text-sm ${t.text}`}>
                    {money(item.amount)}
                  </span>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 text-default-300 hover:text-rose-500 transition-all p-1.5 rounded-lg hover:bg-rose-500/10"
                    aria-label={`Eliminar ${item.label}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2 border-t border-default-200/50">
          <Input
            placeholder="Ej. Netflix, Gimnasio"
            size="sm"
            variant="bordered"
            value={label}
            onValueChange={setLabel}
          />
          <div className="flex gap-2">
            <Input
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              size="sm"
              variant="bordered"
              startContent={<span className="text-default-400 text-xs font-bold">$</span>}
              className="flex-1"
              value={amount}
              onValueChange={setAmount}
            />
            <Select
              size="sm"
              variant="bordered"
              aria-label="Ciclo de cobro"
              className="w-[120px]"
              selectedKeys={[billingCycle]}
              onSelectionChange={(keys) => {
                const k = Array.from(keys)[0];
                if (k === "mensual" || k === "anual") setBillingCycle(k);
              }}
            >
              <SelectItem key="mensual">Mensual</SelectItem>
              <SelectItem key="anual">Anual</SelectItem>
            </Select>
          </div>
          <Button
            fullWidth
            variant="shadow"
            onPress={handleAdd}
            className="font-bold text-sm bg-indigo-500 text-white"
            size="sm"
            isDisabled={!label.trim() || !amountValid}
            startContent={<Plus size={15} />}
          >
            Agregar Fijo
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABONO A META — con botón, no solo Enter
// ─────────────────────────────────────────────────────────────────────────────
function GoalContribution({ current, label, onContribute }: {
  current: number; label: string; onContribute: (v: number) => void;
}) {
  const [value, setValue] = useState("");
  const parsed = parseFloat(value);
  const valid = value !== "" && Number.isFinite(parsed) && parsed > 0;

  const commit = () => {
    if (!valid) return;
    onContribute(round2(parsed));
    setValue("");
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        size="sm"
        variant="faded"
        placeholder="Abonar $"
        aria-label={`Abonar a ${label}`}
        className="w-24"
        type="number"
        min="0"
        inputMode="decimal"
        value={value}
        onValueChange={setValue}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
      />
      <Button
        isIconOnly size="sm" variant="flat" color="secondary"
        className="min-w-8 h-8 bg-purple-500/20 text-purple-600 dark:text-purple-300"
        isDisabled={!valid}
        onPress={commit}
        aria-label={`Guardar abono a ${label}`}
      >
        <Plus size={14} />
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GOALS SECTION
// ─────────────────────────────────────────────────────────────────────────────
function GoalsSection({ items, onAdd, onRemove, onUpdateProgress }: {
  items: GoalItem[];
  onAdd: (label: string, target: string, deadline: string) => void;
  onRemove: (id: string) => void;
  onUpdateProgress: (id: string, newAmount: string) => void;
}) {
  const [label, setLabel] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  const t = TONE.purple;

  const handleAdd = () => {
    if (!label.trim() || !targetAmount || !deadline) return;
    onAdd(label.trim(), targetAmount, deadline);
    setLabel("");
    setTargetAmount("");
    setDeadline("");
  };

  return (
    <Card className={`glass card-hover border ${t.border} col-span-1 sm:col-span-2 lg:col-span-3`}>
      <CardHeader className="flex flex-col items-start px-5 pt-5 pb-0 gap-1">
        <div className={`p-2.5 rounded-xl ${t.iconBg} mb-2`}>
          <div className={t.text}><Target size={18} /></div>
        </div>
        <div>
          <h3 className="text-base font-bold tracking-tight">Metas de Ahorro</h3>
          <p className="text-xs text-default-400">Rastrea tu progreso hacia objetivos específicos</p>
        </div>
      </CardHeader>

      <CardBody className="px-5 py-4 flex flex-col gap-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-default-200/60 rounded-xl text-default-400 gap-1">
            <p className="text-xs font-medium">Sin metas activas</p>
            <p className="text-[11px] text-default-300">Un viaje, un auto, tu fondo de emergencia…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => {
              const progress = item.targetAmount > 0
                ? Math.min(100, (item.currentAmount / item.targetAmount) * 100)
                : 0;
              const done = progress >= 100;
              return (
                <div key={item.id} className={`relative group p-4 rounded-xl ${t.bg} border ${t.border} animate-fade-in-up hover:bg-purple-500/15 transition-colors`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-default-800 flex items-center gap-1.5">
                      {item.label}
                      {done && <Check size={14} className="text-emerald-500" />}
                    </span>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 text-default-300 hover:text-rose-500 transition-all p-1"
                      aria-label={`Eliminar meta ${item.label}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex justify-between text-xs text-default-500 tnum mb-1">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{money(item.currentAmount)}</span>
                    <span>{money(item.targetAmount)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-default-200/60 mb-2 overflow-hidden" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${done ? "bg-emerald-500" : "bg-gradient-to-r from-purple-500 to-indigo-500"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-3 gap-2">
                    <span className="text-[10px] text-default-400 shrink-0">Meta: {item.deadline}</span>
                    <GoalContribution
                      current={item.currentAmount}
                      label={item.label}
                      onContribute={(v) => onUpdateProgress(item.id, round2(item.currentAmount + v).toString())}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-default-200/50 mt-2">
          <Input placeholder="Ej. Viaje, Auto" size="sm" variant="bordered" value={label} onValueChange={setLabel} className="flex-1" />
          <Input type="number" min="0" inputMode="decimal" placeholder="Monto Meta ($)" size="sm" variant="bordered" value={targetAmount} onValueChange={setTargetAmount} className="w-full sm:w-36" />
          <Input type="date" size="sm" variant="bordered" aria-label="Fecha límite" value={deadline} onValueChange={setDeadline} className="w-full sm:w-36" />
          <Button variant="shadow" onPress={handleAdd} isDisabled={!label.trim() || !targetAmount || !deadline} className="font-bold bg-purple-500 text-white">
            Crear Meta
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE STATUS — indicador honesto de sincronización
// ─────────────────────────────────────────────────────────────────────────────
type SaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  const map: Record<Exclude<SaveStatus, "idle">, { icon: React.ReactNode; label: string; cls: string }> = {
    saving:   { icon: <CloudUpload size={13} className="animate-pulse" />, label: "Guardando…", cls: "text-default-400" },
    saved:    { icon: <Check size={13} />, label: "Guardado", cls: "text-emerald-500" },
    error:    { icon: <AlertTriangle size={13} />, label: "Sin conexión", cls: "text-amber-500" },
    conflict: { icon: <AlertTriangle size={13} />, label: "Conflicto", cls: "text-rose-500" },
  };
  const m = map[status];
  return (
    <span className={`hidden sm:flex items-center gap-1.5 text-[11px] font-semibold ${m.cls}`} aria-live="polite">
      {m.icon}
      {m.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
type QuickAddType = "asset" | "liability" | "bucket";

const QUICK_CATEGORIES: Record<QuickAddType, string[]> = {
  asset:     ["Efectivo", "Banco", "Inversión", "Propiedad", "Otros"],
  liability: ["Tarjeta de Crédito", "Préstamo", "Servicios", "Hogar", "Comida", "Transporte", "Otros"],
  bucket:    ["Emergencia", "Viaje", "Auto", "Regalos", "Ahorro", "Otros"],
};

export default function Dashboard() {
  const [assets,        setAssets]        = useState<FinanceItem[]>([]);
  const [liabilities,   setLiabilities]   = useState<FinanceItem[]>([]);
  const [buckets,       setBuckets]       = useState<FinanceItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [goals,         setGoals]         = useState<GoalItem[]>([]);
  const [transactions,  setTransactions]  = useState<TransactionItem[]>([]);
  const [creditCards,   setCreditCards]   = useState<CreditCardItem[]>([]);
  const [installments,  setInstallments]  = useState<InstallmentPlan[]>([]);
  const [budgets,       setBudgets]       = useState<BudgetItem[]>([]);
  const [history,       setHistory]       = useState<HistorySnapshot[]>([]);
  const [privacy,       setPrivacy]       = useState(false);

  // ── Bloqueo biométrico ───────────────────────────────────────
  const [locked,        setLocked]        = useState(false);
  const [lockOn,        setLockOn]        = useState(false);
  const [bioAvailable,  setBioAvailable]  = useState(false);
  const [unlocking,     setUnlocking]     = useState(false);

  // ── Notificaciones push ──────────────────────────────────────
  const [pushStatus, setPushStatus] = useState<"on" | "off" | "denied" | "unsupported">("unsupported");
  const [pushBusy,   setPushBusy]   = useState(false);

  const { user } = useUser();
  const [mounted,       setMounted]       = useState(false);
  const [isLoading,     setIsLoading]     = useState(true);
  const [loadError,     setLoadError]     = useState(false);
  const [activeTab,     setActiveTab]     = useState<NavTab>("dashboard");
  const [saveStatus,    setSaveStatus]    = useState<SaveStatus>("idle");

  // Concurrencia optimista: rev del documento en servidor
  const revRef = useRef<number>(0);
  const [conflictData, setConflictData] = useState<any | null>(null);

  // Deshacer borrado
  const [pendingUndo, setPendingUndo] = useState<{
    label: string;
    restore: () => void;
  } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // ── Carga inicial ─────────────────────────────────────────────
  const applyServerData = useCallback((data: any) => {
    setAssets(data.assets || []);
    setLiabilities(data.liabilities || []);
    setBuckets(data.buckets || []);
    setSubscriptions(data.subscriptions || []);
    setGoals(data.goals || []);
    setTransactions(data.transactions || []);
    setCreditCards(data.creditCards || []);
    setInstallments(data.installments || []);
    setBudgets(data.budgets || []);
    setHistory(data.history || []);
    revRef.current = typeof data.rev === "number" ? data.rev : 0;
  }, []);

  useEffect(() => {
    setMounted(true);
    setPrivacy(loadPrivacyMode());

    // Candado biométrico: si está activado, la app abre bloqueada
    const enabled = isLockEnabled();
    setLockOn(enabled);
    setLocked(enabled);
    biometricsAvailable().then(setBioAvailable);
    getPushStatus().then(setPushStatus);

    const fetchData = async () => {
      try {
        const res = await fetch("/api/finance");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        applyServerData(data);
        setLoadError(false);

        // ── Auto-snapshot: si hay datos y el último snapshot tiene más de
        //    N días (default 7), guardar uno automáticamente ──────────────
        const hasData = (data.assets?.length || 0) + (data.liabilities?.length || 0) > 0;
        if (hasData) {
          const days = data.settings?.autoSnapshotDays || 7;
          const last = (data.history || [])[0];
          const lastAge = last ? (Date.now() - new Date(last.date).getTime()) / 86_400_000 : Infinity;
          if (lastAge >= days) {
            const sum = (arr: any[]) => (arr || []).reduce((s: number, i: any) => s + (i.amount || 0), 0);
            const tA = sum(data.assets), tL = sum(data.liabilities), tB = sum(data.buckets);
            const tF = (data.subscriptions || []).reduce(
              (s: number, i: any) => s + (i.billingCycle === "anual" ? i.amount / 12 : i.amount), 0);
            const avail = tA - tL - tB;
            const snap: HistorySnapshot = {
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              totalAssets: round2(tA),
              totalLiabilities: round2(tL),
              totalBuckets: round2(tB),
              totalFixedCosts: round2(tF),
              available: round2(avail),
              deficit: avail < 0 ? round2(Math.abs(avail)) : 0,
              auto: true,
              assets: data.assets || [],
              liabilities: data.liabilities || [],
              buckets: data.buckets || [],
              subscriptions: data.subscriptions || [],
              goals: data.goals || [],
            };
            setHistory((prev) => [snap, ...prev]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [applyServerData]);

  const togglePrivacy = () => {
    const next = !privacy;
    setPrivacyMode(next);
    setPrivacy(next);
  };

  // ── Candado biométrico: handlers ─────────────────────────────
  const handleUnlock = async () => {
    setUnlocking(true);
    const ok = await verifyLock();
    setUnlocking(false);
    if (ok) setLocked(false);
  };

  const toggleBiometricLock = async () => {
    if (lockOn) {
      disableLock();
      setLockOn(false);
      return;
    }
    const ok = await enableLock(user?.firstName || user?.username || "usuario");
    if (ok) setLockOn(true);
  };

  // ── Notificaciones: handlers ─────────────────────────────────
  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushStatus === "on") {
        await disablePush();
        setPushStatus("off");
      } else {
        const res = await enablePush();
        setPushStatus(res.ok ? "on" : res.reason === "denied" ? "denied" : "off");
      }
    } finally {
      setPushBusy(false);
    }
  };

  // ── Guardado con control de conflictos ───────────────────────
  // Los guardados se serializan: nunca hay dos POST en vuelo a la vez
  // (dos peticiones con el mismo baseRev se auto-conflictuarían).
  const inFlightRef = useRef(false);
  const pendingSaveRef = useRef<Parameters<typeof doSave> | null>(null);

  type SavePayload = {
    assets: FinanceItem[]; liabilities: FinanceItem[]; buckets: FinanceItem[];
    history: HistorySnapshot[]; subscriptions: SubscriptionItem[]; goals: GoalItem[];
    transactions: TransactionItem[]; creditCards: CreditCardItem[]; budgets: BudgetItem[];
    installments: InstallmentPlan[];
  };

  async function doSave(payload: SavePayload) {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, baseRev: revRef.current }),
      });

      if (res.status === 409) {
        // Otro dispositivo/pestaña guardó primero. No pisar sus datos.
        const payload = await res.json();
        setConflictData(payload.server || null);
        setSaveStatus("conflict");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      revRef.current = typeof data.rev === "number" ? data.rev : revRef.current + 1;
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch (error) {
      console.error("Failed to save data:", error);
      setSaveStatus("error");
    }
  }

  const saveData = useCallback(async (
    ...args: Parameters<typeof doSave>
  ) => {
    if (inFlightRef.current) {
      // Ya hay un guardado en curso: recordar el más reciente y salir
      pendingSaveRef.current = args;
      return;
    }
    inFlightRef.current = true;
    try {
      await doSave(...args);
      // Si mientras guardábamos llegó otro cambio, guardarlo ahora
      while (pendingSaveRef.current) {
        const next = pendingSaveRef.current;
        pendingSaveRef.current = null;
        await doSave(...next);
      }
    } finally {
      inFlightRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mounted || isLoading || loadError) return;
    const timer = setTimeout(
      () => saveData({ assets, liabilities, buckets, history, subscriptions, goals, transactions, creditCards, budgets, installments }),
      900,
    );
    return () => clearTimeout(timer);
  }, [assets, liabilities, buckets, history, subscriptions, goals, transactions, creditCards, budgets, installments, mounted, isLoading, loadError, saveData]);

  // ── Totales ──────────────────────────────────────────────────
  const totalAssets      = round2(assets.reduce((s, i) => s + i.amount, 0));
  const totalLiabilities = round2(liabilities.reduce((s, i) => s + i.amount, 0));
  const totalBuckets     = round2(buckets.reduce((s, i) => s + i.amount, 0));
  const totalFixedCosts  = round2(subscriptions.reduce(
    (s, i) => s + (i.billingCycle === "anual" ? i.amount / 12 : i.amount), 0,
  ));
  const available        = round2(totalAssets - totalLiabilities - totalBuckets);
  const afterFixed       = round2(available - totalFixedCosts);

  const animatedAvailable = useAnimatedCounter(available);
  const isPositive        = available >= 0;
  const balanceProgress   = totalAssets > 0
    ? Math.max(0, Math.min(100, (available / totalAssets) * 100))
    : 0;

  // ── Deshacer borrados ────────────────────────────────────────
  const scheduleUndo = (label: string, restore: () => void) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingUndo({ label, restore });
    undoTimerRef.current = setTimeout(() => setPendingUndo(null), 5000);
  };

  const handleUndo = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    pendingUndo?.restore();
    setPendingUndo(null);
  };

  // ── Handlers ─────────────────────────────────────────────────
  const handleAddItem = (type: QuickAddType, label: string, amount: string, date: string, category: string) => {
    const parsed = parseFloat(amount);
    if (!label || !Number.isFinite(parsed) || parsed <= 0) return;
    const item: FinanceItem = {
      id: crypto.randomUUID(),
      label,
      amount: round2(parsed),
      date: date || new Date().toISOString().split("T")[0],
      type,
      category,
    };
    if (type === "asset")     setAssets((prev) => [...prev, item]);
    if (type === "liability") setLiabilities((prev) => [...prev, item]);
    if (type === "bucket")    setBuckets((prev) => [...prev, item]);
  };

  const removeItem = (id: string, type: QuickAddType) => {
    const lists = { asset: assets, liability: liabilities, bucket: buckets };
    const setters = { asset: setAssets, liability: setLiabilities, bucket: setBuckets };
    const list = lists[type];
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const item = list[idx];
    setters[type](list.filter((i) => i.id !== id));
    scheduleUndo(item.label, () => {
      setters[type]((prev) => {
        const next = [...prev];
        next.splice(Math.min(idx, next.length), 0, item);
        return next;
      });
    });
  };

  const handleAddSubscription = (label: string, amount: string, billingCycle: "mensual" | "anual", category: string) => {
    const parsed = parseFloat(amount);
    if (!label || !Number.isFinite(parsed) || parsed <= 0) return;
    setSubscriptions((prev) => [...prev, {
      id: crypto.randomUUID(), label, amount: round2(parsed), billingCycle, category,
    }]);
  };

  const removeSubscription = (id: string) => {
    const idx = subscriptions.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const item = subscriptions[idx];
    setSubscriptions(subscriptions.filter((i) => i.id !== id));
    scheduleUndo(item.label, () => {
      setSubscriptions((prev) => {
        const next = [...prev];
        next.splice(Math.min(idx, next.length), 0, item);
        return next;
      });
    });
  };

  const handleAddGoal = (label: string, targetAmount: string, deadline: string) => {
    const parsed = parseFloat(targetAmount);
    if (!label || !Number.isFinite(parsed) || parsed <= 0) return;
    setGoals((prev) => [...prev, {
      id: crypto.randomUUID(), label, targetAmount: round2(parsed), currentAmount: 0, deadline,
    }]);
  };

  const removeGoal = (id: string) => {
    const idx = goals.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const item = goals[idx];
    setGoals(goals.filter((i) => i.id !== id));
    scheduleUndo(item.label, () => {
      setGoals((prev) => {
        const next = [...prev];
        next.splice(Math.min(idx, next.length), 0, item);
        return next;
      });
    });
  };

  const updateGoalProgress = (id: string, currentAmount: string) => {
    const parsed = parseFloat(currentAmount);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setGoals(goals.map((g) => (g.id === id ? { ...g, currentAmount: round2(parsed) } : g)));
  };

  // ── Movimientos (ledger) ─────────────────────────────────────
  const addTransaction = (t: Omit<TransactionItem, "id">) => {
    setTransactions((prev) => [...prev, { ...t, id: crypto.randomUUID() }]);
  };

  const removeTransaction = (id: string) => {
    const idx = transactions.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const item = transactions[idx];
    setTransactions(transactions.filter((i) => i.id !== id));
    scheduleUndo(item.label, () => {
      setTransactions((prev) => {
        const next = [...prev];
        next.splice(Math.min(idx, next.length), 0, item);
        return next;
      });
    });
  };

  // ── Tarjetas de crédito ──────────────────────────────────────
  const addCreditCard = (c: Omit<CreditCardItem, "id">) => {
    setCreditCards((prev) => [...prev, { ...c, id: crypto.randomUUID() }]);
  };

  const removeCreditCard = (id: string) => {
    const idx = creditCards.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const item = creditCards[idx];
    // Al quitar la tarjeta también se van sus compras a meses
    const orphaned = installments.filter((p) => p.cardId === id);
    setCreditCards(creditCards.filter((i) => i.id !== id));
    if (orphaned.length) setInstallments(installments.filter((p) => p.cardId !== id));
    scheduleUndo(item.label, () => {
      setCreditCards((prev) => {
        const next = [...prev];
        next.splice(Math.min(idx, next.length), 0, item);
        return next;
      });
      if (orphaned.length) setInstallments((prev) => [...prev, ...orphaned]);
    });
  };

  const updateCardBalance = (id: string, balance: number) => {
    setCreditCards((prev) => prev.map((c) => (c.id === id ? { ...c, balance } : c)));
  };

  /**
   * Compra cargada a una tarjeta: suma a su deuda de contado y deja
   * el registro en Movimientos (para presupuestos y analíticas).
   */
  const chargeToCard = (cardId: string, label: string, amount: number, date: string, category: string) => {
    setCreditCards((prev) => prev.map((c) =>
      c.id === cardId ? { ...c, balance: round2((c.balance || 0) + amount) } : c,
    ));
    const card = creditCards.find((c) => c.id === cardId);
    setTransactions((prev) => [...prev, {
      id: crypto.randomUUID(),
      label: card ? `${label} · ${card.label}` : label,
      amount,
      date: date || new Date().toISOString().split("T")[0],
      type: "expense",
      category,
      source: "manual",
    }]);
  };

  // ── Compras a meses sin intereses ────────────────────────────
  const addInstallment = (p: Omit<InstallmentPlan, "id">) => {
    setInstallments((prev) => [...prev, { ...p, id: crypto.randomUUID() }]);
  };

  const removeInstallment = (id: string) => {
    const idx = installments.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const item = installments[idx];
    setInstallments(installments.filter((i) => i.id !== id));
    scheduleUndo(item.label, () => {
      setInstallments((prev) => {
        const next = [...prev];
        next.splice(Math.min(idx, next.length), 0, item);
        return next;
      });
    });
  };

  // ── Presupuestos ─────────────────────────────────────────────
  const addBudget = (b: Omit<BudgetItem, "id">) => {
    setBudgets((prev) => [...prev, { ...b, id: crypto.randomUUID() }]);
  };

  const removeBudget = (id: string) => {
    setBudgets(budgets.filter((i) => i.id !== id));
  };

  // ── Modales ──────────────────────────────────────────────────
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isDataModalOpen, onOpen: onDataModalOpen, onOpenChange: onDataModalChange } = useDisclosure();
  const { isOpen: isQuickAddOpen, onOpen: onQuickAddOpen, onOpenChange: onQuickAddChange } = useDisclosure();
  const { isOpen: isClearOpen, onOpen: onClearOpen, onOpenChange: onClearChange } = useDisclosure();
  const { isOpen: isImportOpen, onOpen: onImportOpen, onOpenChange: onImportChange } = useDisclosure();
  const { isOpen: isVoiceOpen, onOpen: onVoiceOpen, onOpenChange: onVoiceChange } = useDisclosure();

  const [selectedSnapshot, setSelectedSnapshot] = useState<HistorySnapshot | null>(null);
  const [importPreview, setImportPreview] = useState<{ data: any; counts: string } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Quick add (FAB)
  const [quickType, setQuickType]         = useState<QuickAddType>("liability");
  const [quickLabel, setQuickLabel]       = useState("");
  const [quickAmount, setQuickAmount]     = useState("");
  const [quickCategory, setQuickCategory] = useState(QUICK_CATEGORIES.liability[0]);

  const quickAmountValid = quickAmount !== "" && Number.isFinite(parseFloat(quickAmount)) && parseFloat(quickAmount) > 0;

  const submitQuickAdd = (close: () => void) => {
    if (!quickLabel.trim() || !quickAmountValid) return;
    handleAddItem(quickType, quickLabel.trim(), quickAmount, "", quickCategory);
    setQuickLabel("");
    setQuickAmount("");
    close();
  };

  // ── Export / Import ──────────────────────────────────────────
  const exportData = () => {
    const data = { assets, liabilities, buckets, subscriptions, goals, history };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (typeof data !== "object" || data === null) throw new Error("bad");
        const counts = [
          `${(data.assets || []).length} activos`,
          `${(data.liabilities || []).length} gastos`,
          `${(data.buckets || []).length} apartados`,
          `${(data.subscriptions || []).length} fijos`,
          `${(data.goals || []).length} metas`,
          `${(data.history || []).length} snapshots`,
        ].join(" · ");
        setImportError(null);
        setImportPreview({ data, counts });
        onImportOpen();
      } catch {
        setImportPreview(null);
        setImportError("El archivo no es un respaldo válido de Finance Control.");
        onImportOpen();
      }
    };
    reader.readAsText(file);
  };

  const confirmImport = (close: () => void) => {
    if (!importPreview) return;
    const d = importPreview.data;
    setAssets(d.assets || []);
    setLiabilities(d.liabilities || []);
    setBuckets(d.buckets || []);
    setSubscriptions(d.subscriptions || []);
    setGoals(d.goals || []);
    setHistory(d.history || []);
    setImportPreview(null);
    close();
  };

  // ── Snapshots ────────────────────────────────────────────────
  const saveSnapshot = () => {
    const snapshot: HistorySnapshot = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      totalAssets,
      totalLiabilities,
      totalBuckets,
      totalFixedCosts,
      available,
      deficit: available < 0 ? Math.abs(available) : 0,
      assets:        [...assets],
      liabilities:   [...liabilities],
      buckets:       [...buckets],
      subscriptions: [...subscriptions],
      goals:         [...goals],
    };
    setHistory([snapshot, ...history]);
  };

  const confirmClearHistory = (close: () => void) => {
    setHistory([]);
    close();
  };

  const openHistoryDetails = (snapshot: HistorySnapshot) => {
    setSelectedSnapshot(snapshot);
    onOpen();
  };

  const handleStartTour = () => startTour(isDark);

  const resolveConflict = () => {
    if (conflictData) {
      applyServerData(conflictData);
      setConflictData(null);
      setSaveStatus("idle");
    }
  };

  // ── Navegación entre tabs ────────────────────────────────────
  const changeTab = (tab: NavTab) => {
    setActiveTab(tab);
    setTimeout(() => {
      if (tab === "dashboard") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        document.getElementById("tab-content")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  if (!mounted) return <DashboardSkeleton />;

  const historyTone = [
    { label: "Activos",   tone: TONE.emerald, icon: <DollarSign size={20} /> },
    { label: "Deudas",    tone: TONE.rose,    icon: <ShieldAlert size={20} /> },
    { label: "Apartados", tone: TONE.amber,   icon: <Wallet size={20} /> },
  ];

  return (
    <div className="min-h-screen text-foreground font-sans">

      {/* ── TOP NAV ──────────────────────────────────────────── */}
      <nav className="glass-nav w-full sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-md shadow-emerald-500/25">
              <Wallet className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight gradient-text-emerald">
                Finance Control
              </h1>
              <p className="text-[10px] text-default-400 -mt-0.5 hidden sm:block">
                Gestión financiera inteligente
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 bg-default-100/70 rounded-xl p-1">
            {([
              { id: "dashboard",    icon: <LayoutDashboard size={15} />, label: "Inicio" },
              { id: "transactions", icon: <ReceiptText size={15} />,     label: "Movimientos" },
              { id: "analytics",    icon: <BarChart2 size={15} />,       label: "Análisis" },
              { id: "ai",           icon: <Brain size={15} />,            label: "FinanceAI" },
              { id: "history",      icon: <History size={15} />,          label: "Historial" },
            ] as { id: NavTab; icon: React.ReactNode; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => changeTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-default-100 text-emerald-600 dark:text-emerald-400 shadow-sm"
                    : "text-default-500 hover:text-default-700"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <SaveIndicator status={saveStatus} />
            <SignedIn>
              <Button
                isIconOnly variant="light" size="sm"
                onPress={onVoiceOpen}
                className="text-default-400 hover:text-emerald-500"
                aria-label="Asistente de voz"
              >
                <Mic size={18} />
              </Button>
              <Button
                isIconOnly variant="light" size="sm"
                onPress={togglePrivacy}
                className="text-default-400 hover:text-emerald-500"
                aria-label={privacy ? "Mostrar montos" : "Ocultar montos"}
              >
                {privacy ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
            </SignedIn>
            <Button
              isIconOnly variant="light" size="sm"
              onPress={handleStartTour}
              className="text-default-400 hover:text-emerald-500"
              aria-label="Iniciar tour"
            >
              <HelpCircle size={18} />
            </Button>
            <ThemeSwitcher />
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* ── SIGNED OUT ────────────────────────────────────────── */}
      <SignedOut>
        <div className="min-h-[90dvh] flex flex-col items-center justify-center p-6 text-center">
          <div className="animate-fade-in-up">
            <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-emerald-500 to-cyan-500 shadow-2xl shadow-emerald-500/40 mb-8">
              <Wallet className="text-white w-14 h-14" />
            </div>
            <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tight gradient-text-emerald">
              Finance Control
            </h1>
            <p className="text-lg text-default-500 mb-2 max-w-md mx-auto">
              Gestión financiera personal con{" "}
              <span className="font-bold text-indigo-500">Inteligencia Artificial</span>
            </p>
            <p className="text-sm text-default-400 mb-10 max-w-sm mx-auto">
              Activos · Pasivos · Apartados · Predicción Neural
            </p>
            <SignInButton mode="modal">
              <Button
                size="lg"
                className="font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-xl shadow-emerald-500/40 hover:shadow-emerald-500/60 transition-shadow"
              >
                Iniciar Sesión
                <ChevronRight size={18} />
              </Button>
            </SignInButton>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mt-12 animate-fade-in-up delay-300">
            {["📊 Analíticas avanzadas", "🧠 Red Neuronal IA", "📱 Móvil amigable", "🔒 Datos seguros"].map((f) => (
              <span key={f} className="glass px-4 py-2 rounded-full text-xs font-medium text-default-600">{f}</span>
            ))}
          </div>
        </div>
      </SignedOut>

      {/* ── SIGNED IN ─────────────────────────────────────────── */}
      <SignedIn>
        {/* ── CANDADO BIOMÉTRICO ──────────────────────────────── */}
        {locked && (
          <div className="fixed inset-0 z-[100] hero-card flex flex-col items-center justify-center gap-6 p-6">
            <div className="p-5 rounded-3xl bg-white/5 border border-white/15">
              <Fingerprint size={44} className="text-emerald-400" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-black text-white mb-1">Finance Control está bloqueada</h2>
              <p className="text-sm text-white/50">Usa tu huella o rostro para entrar</p>
            </div>
            <Button
              size="lg"
              className="bg-white text-black font-bold px-8"
              startContent={<Lock size={17} />}
              isLoading={unlocking}
              onPress={handleUnlock}
            >
              Desbloquear
            </Button>
            <p className="text-[11px] text-white/30 max-w-[260px] text-center">
              Si tu huella no funciona, desbloquea con el método de tu dispositivo (PIN/patrón) cuando el sistema lo ofrezca.
            </p>
          </div>
        )}

        {isLoading ? (
          <DashboardSkeleton />
        ) : loadError ? (
          <main className="max-w-lg mx-auto px-6 py-24 text-center">
            <div className="glass p-8 animate-fade-in-scale">
              <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-amber-500" />
              <h2 className="text-lg font-bold mb-2">No pudimos cargar tus datos</h2>
              <p className="text-sm text-default-500 mb-6">
                Revisa tu conexión a internet. Tus datos siguen seguros en el servidor.
              </p>
              <Button
                color="primary"
                variant="shadow"
                startContent={<RefreshCw size={16} />}
                onPress={() => window.location.reload()}
              >
                Reintentar
              </Button>
            </div>
          </main>
        ) : (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8 pb-28 md:pb-8">

          {/* ── HERO ─────────────────────────────────────────── */}
          <section className="animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

              <Card
                id="balance-card"
                className={`col-span-1 md:col-span-8 border-0 overflow-hidden relative ${
                  isPositive
                    ? "hero-card glow-hero-positive"
                    : "hero-card-negative glow-hero-negative"
                }`}
              >
                {/* Anillos decorativos, como el grabado de una tarjeta metálica */}
                <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-white/10" />
                <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full border border-white/5" />
                <div className="absolute -bottom-12 -left-12 w-40 h-40 rounded-full border border-white/5" />

                <CardBody className="relative z-10 py-8 px-7">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <PiggyBank size={16} className={isPositive ? "text-emerald-400" : "text-rose-400"} />
                      <p className="text-white/60 font-semibold text-xs tracking-[0.2em] uppercase">
                        {isPositive ? "Balance Disponible" : "Déficit Acumulado"}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold tracking-widest text-white/40 border border-white/15 rounded-md px-2 py-0.5">
                      MXN
                    </span>
                  </div>
                  <h2 className={`text-6xl sm:text-7xl font-black tracking-tighter mb-2 tnum ${
                    isPositive ? "neon-number" : "neon-number-negative"
                  }`}>
                    {!isPositive && "−"}{money(Math.abs(animatedAvailable))}
                  </h2>
                  {subscriptions.length > 0 && (
                    <p className="text-white/70 text-sm mb-1 tnum">
                      Después de gastos fijos: <span className={`font-bold ${afterFixed >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{money(afterFixed)}</span>
                      <span className="text-white/40"> · {money(totalFixedCosts)}/mes en fijos</span>
                    </p>
                  )}
                  <p className="text-white/40 text-sm mb-5">Actualizado ahora</p>

                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-white/50 mb-1.5">
                      <span>Balance vs Activos totales</span>
                      <span className="tnum text-white/70">{balanceProgress.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isPositive
                            ? "bg-gradient-to-r from-emerald-400 to-cyan-400"
                            : "bg-gradient-to-r from-rose-400 to-orange-400"
                        }`}
                        style={{ width: `${balanceProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <Button
                      id="save-snapshot-btn"
                      className="bg-white text-black font-bold hover:bg-white/90 shadow-lg shadow-black/30"
                      startContent={<Save size={16} />}
                      onPress={saveSnapshot}
                      size="sm"
                    >
                      Guardar Snapshot
                    </Button>
                    <Button
                      variant="light"
                      className="text-white/60 hover:text-white hover:bg-white/10"
                      size="sm"
                      startContent={<History size={16} />}
                      onPress={() => changeTab("history")}
                    >
                      Ver historial
                    </Button>
                    <Button
                      variant="light"
                      className="text-white/60 hover:text-white hover:bg-white/10"
                      size="sm"
                      startContent={<Database size={16} />}
                      onPress={onDataModalOpen}
                    >
                      Ajustes
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <div className="col-span-1 md:col-span-4 flex flex-col gap-3">
                <StatCard label="Total Activos"  value={totalAssets}      icon={<TrendingUp size={20} />}   tone="emerald" delay={100} />
                <StatCard label="Gastos / Deudas" value={totalLiabilities} icon={<TrendingDown size={20} />} tone="rose"    delay={200} />
                <StatCard label="Apartados"       value={totalBuckets}     icon={<Wallet size={20} />}       tone="amber"   delay={300} />
              </div>
            </div>
          </section>

          <div id="tab-content" style={{ scrollMarginTop: "72px" }} />

          {/* ── POR PAGAR (siempre visible en Inicio) ─────────── */}
          {activeTab === "dashboard" && (
            <UpcomingPayments cards={creditCards} subscriptions={subscriptions} installments={installments} />
          )}

          {/* ── MIS FINANZAS ──────────────────────────────────── */}
          <section className={activeTab !== "dashboard" ? "hidden" : ""} id="management-sections">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold section-title">Mis Finanzas</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
              <Section
                title="Ingresos & Activos"
                description="Cuentas, efectivo, inversiones"
                icon={<DollarSign size={18} />}
                items={assets}
                total={totalAssets}
                color="success"
                categories={QUICK_CATEGORIES.asset}
                onAdd={(l, a, d, c) => handleAddItem("asset", l, a, d, c)}
                onRemove={(id) => removeItem(id, "asset")}
              />
              <Section
                title="Gastos & Deudas"
                description="Tarjetas, préstamos, pendientes"
                icon={<ShieldAlert size={18} />}
                items={liabilities}
                total={totalLiabilities}
                color="danger"
                categories={QUICK_CATEGORIES.liability}
                onAdd={(l, a, d, c) => handleAddItem("liability", l, a, d, c)}
                onRemove={(id) => removeItem(id, "liability")}
                cards={creditCards}
                onAddToCard={chargeToCard}
              />
              <Section
                title="Apartados & Ahorro"
                description="Fondos reservados, sobres"
                icon={<Wallet size={18} />}
                items={buckets}
                total={totalBuckets}
                color="warning"
                categories={QUICK_CATEGORIES.bucket}
                onAdd={(l, a, d, c) => handleAddItem("bucket", l, a, d, c)}
                onRemove={(id) => removeItem(id, "bucket")}
              />
              <SubscriptionsSection
                items={subscriptions}
                total={totalFixedCosts}
                onAdd={handleAddSubscription}
                onRemove={removeSubscription}
              />
              <CreditCards
                cards={creditCards}
                installments={installments}
                onAdd={addCreditCard}
                onRemove={removeCreditCard}
                onUpdateBalance={updateCardBalance}
                onAddInstallment={addInstallment}
                onRemoveInstallment={removeInstallment}
              />
              <Budgets
                budgets={budgets}
                transactions={transactions}
                onAdd={addBudget}
                onRemove={removeBudget}
              />
              <GoalsSection
                items={goals}
                onAdd={handleAddGoal}
                onRemove={removeGoal}
                onUpdateProgress={updateGoalProgress}
              />
            </div>
          </section>

          {/* ── MOVIMIENTOS ───────────────────────────────────── */}
          <section className={activeTab !== "transactions" ? "hidden" : ""}>
            <Divider className="my-2" />
            <Transactions
              transactions={transactions}
              onAdd={addTransaction}
              onRemove={removeTransaction}
            />
          </section>

          {/* ── ANALYTICS ─────────────────────────────────────── */}
          <section className={activeTab !== "analytics" ? "hidden" : ""}>
            <Divider className="my-2" />
            <Analytics history={history} assets={assets} liabilities={liabilities} isDark={isDark} />
          </section>

          {/* ── FINANCE AI ────────────────────────────────────── */}
          <section className={activeTab !== "ai" ? "hidden" : ""}>
            <Divider className="my-2" />
            <FinanceAI history={history} assets={assets} liabilities={liabilities} buckets={buckets} isDark={isDark} />
          </section>

          {/* ── HISTORIAL ─────────────────────────────────────── */}
          <section id="history-section" className={activeTab !== "history" ? "hidden" : ""}>
            <Divider className="my-2" />
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-xl font-bold section-title">Historial</h3>
                <p className="text-xs text-default-400 mt-1">Registro de balances guardados</p>
              </div>
              {history.length > 0 && (
                <Button
                  size="sm" color="danger" variant="light"
                  startContent={<Trash2 size={14} />}
                  onPress={onClearOpen}
                >
                  Limpiar
                </Button>
              )}
            </div>

            <Card className="glass border-0">
              <div className="overflow-x-auto">
                <Table
                  aria-label="Historial de balances"
                  removeWrapper
                  className="min-w-[500px]"
                  selectionMode="none"
                >
                  <TableHeader>
                    <TableColumn className="text-xs font-bold uppercase tracking-wide">Fecha</TableColumn>
                    <TableColumn className="text-xs font-bold uppercase tracking-wide text-right">Activos</TableColumn>
                    <TableColumn className="text-xs font-bold uppercase tracking-wide text-right">Gastos</TableColumn>
                    <TableColumn className="text-xs font-bold uppercase tracking-wide text-right">Apartados</TableColumn>
                    <TableColumn className="text-xs font-bold uppercase tracking-wide text-right">Disponible</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent={
                    <div className="py-12 text-center text-default-400">
                      <History size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aún no hay historial guardado</p>
                      <p className="text-xs mt-1">Presiona &quot;Guardar Snapshot&quot; para registrar tu balance actual</p>
                    </div>
                  }>
                    {history.map((h) => (
                      <TableRow
                        key={h.id}
                        className="cursor-pointer hover:bg-default-50 transition-colors border-b border-divider last:border-none"
                        onClick={() => openHistoryDetails(h)}
                      >
                        <TableCell className="font-medium text-xs py-3">
                          {new Date(h.date).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" })}
                          {h.auto && (
                            <span className="ml-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-default-100 text-default-400">
                              auto
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="tnum text-emerald-600 dark:text-emerald-400 text-sm font-bold text-right">
                          {money(h.totalAssets)}
                        </TableCell>
                        <TableCell className="tnum text-rose-600 dark:text-rose-400 text-sm font-bold text-right">
                          −{money(h.totalLiabilities)}
                        </TableCell>
                        <TableCell className="tnum text-amber-600 dark:text-amber-400 text-sm font-bold text-right">
                          −{money(h.totalBuckets)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Chip
                            color={h.available >= 0 ? "success" : "danger"}
                            variant="flat"
                            size="sm"
                            className="font-bold tnum"
                          >
                            {money(h.available)}
                          </Chip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </section>
        </main>
        )}

        {/* ── FAB → captura rápida ────────────────────────────── */}
        {!isLoading && !loadError && (
          <button
            className="fab md:hidden"
            onClick={onQuickAddOpen}
            aria-label="Agregar registro rápido"
          >
            <Plus size={24} />
          </button>
        )}

        {/* ── BOTTOM NAV ──────────────────────────────────────── */}
        <BottomNav active={activeTab} onChange={changeTab} />

        {/* ── TOAST DESHACER ──────────────────────────────────── */}
        {pendingUndo && (
          <div className="undo-toast" role="status">
            <span className="text-xs text-default-600 max-w-[180px] truncate">
              Se eliminó <span className="font-bold">{pendingUndo.label}</span>
            </span>
            <Button
              size="sm"
              variant="flat"
              color="primary"
              className="font-bold"
              startContent={<Undo2 size={14} />}
              onPress={handleUndo}
            >
              Deshacer
            </Button>
          </div>
        )}

        {/* ── MODAL: captura rápida (FAB) ─────────────────────── */}
        <Modal isOpen={isQuickAddOpen} onOpenChange={onQuickAddChange} placement="bottom-center" backdrop="blur">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">Registro rápido</ModalHeader>
                <ModalBody className="pb-2">
                  <div className="flex gap-2">
                    {([
                      { id: "asset",     label: "Activo",   cls: "bg-emerald-500" },
                      { id: "liability", label: "Gasto",    cls: "bg-rose-500" },
                      { id: "bucket",    label: "Apartado", cls: "bg-amber-500" },
                    ] as { id: QuickAddType; label: string; cls: string }[]).map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setQuickType(opt.id);
                          setQuickCategory(QUICK_CATEGORIES[opt.id][0]);
                        }}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                          quickType === opt.id
                            ? `${opt.cls} text-white shadow-md`
                            : "bg-default-100 text-default-500 hover:bg-default-200"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <Input
                    autoFocus
                    placeholder="Descripción"
                    variant="bordered"
                    value={quickLabel}
                    onValueChange={setQuickLabel}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      placeholder="0.00"
                      variant="bordered"
                      startContent={<span className="text-default-400 text-sm font-bold">$</span>}
                      className="flex-1"
                      value={quickAmount}
                      onValueChange={setQuickAmount}
                    />
                    <Select
                      variant="bordered"
                      aria-label="Categoría"
                      className="w-[150px]"
                      selectedKeys={[quickCategory]}
                      onChange={(e) => setQuickCategory(e.target.value || QUICK_CATEGORIES[quickType][0])}
                    >
                      {QUICK_CATEGORIES[quickType].map((cat) => (
                        <SelectItem key={cat}>{cat}</SelectItem>
                      ))}
                    </Select>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>Cancelar</Button>
                  <Button
                    color="primary"
                    variant="shadow"
                    className="font-bold"
                    isDisabled={!quickLabel.trim() || !quickAmountValid}
                    onPress={() => submitQuickAdd(onClose)}
                    startContent={<Plus size={16} />}
                  >
                    Agregar
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* ── MODAL: asistente de voz ─────────────────────────── */}
        <VoiceAssistant
          isOpen={isVoiceOpen}
          onOpenChange={onVoiceChange}
          cards={creditCards}
          installments={installments}
          available={available}
          onAddTransaction={(t) => {
            addTransaction(t);
          }}
        />

        {/* ── MODAL: detalles de snapshot ─────────────────────── */}
        <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl" scrollBehavior="inside" backdrop="blur">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <span className="gradient-text-emerald">Detalles del Snapshot</span>
                  <span className="text-small font-normal text-default-400">
                    {selectedSnapshot &&
                      new Date(selectedSnapshot.date).toLocaleDateString("es-MX", {
                        weekday: "long", year: "numeric", month: "long", day: "numeric",
                      })}
                  </span>
                </ModalHeader>
                <ModalBody>
                  {selectedSnapshot && (
                    <div className="space-y-5">
                      <div className="flex flex-col md:flex-row gap-5">
                        <div className="flex justify-center">
                          <CalendarWidget
                            aria-label="Fecha del snapshot"
                            value={parseDate(selectedSnapshot.date.split("T")[0])}
                            isReadOnly
                            className="shadow-md border border-default-100 rounded-2xl"
                          />
                        </div>
                        <div className="flex-grow grid grid-cols-1 gap-3 content-center">
                          {[
                            { ...historyTone[0], value: selectedSnapshot.totalAssets },
                            { ...historyTone[1], value: selectedSnapshot.totalLiabilities },
                            { ...historyTone[2], value: selectedSnapshot.totalBuckets },
                          ].map(({ label, value, tone, icon }) => (
                            <Card key={label} className={`${tone.bg} border ${tone.border} shadow-none`}>
                              <CardBody className="py-3 px-4 flex flex-row items-center justify-between">
                                <div>
                                  <p className={`text-xs font-bold uppercase ${tone.text}`}>{label}</p>
                                  <p className={`text-xl font-extrabold tnum ${tone.textStrong}`}>
                                    {money(value)}
                                  </p>
                                </div>
                                <div className={`p-2 ${tone.iconBg} rounded-xl ${tone.text}`}>{icon}</div>
                              </CardBody>
                            </Card>
                          ))}
                        </div>
                      </div>

                      <Divider />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { label: "Activos",   items: selectedSnapshot.assets,      tone: TONE.emerald },
                          { label: "Deudas",    items: selectedSnapshot.liabilities, tone: TONE.rose },
                          { label: "Apartados", items: selectedSnapshot.buckets,     tone: TONE.amber },
                        ].map(({ label, items, tone }) => (
                          <div key={label}>
                            <h4 className={`font-bold text-sm mb-2 ${tone.text}`}>{label}</h4>
                            <div className="space-y-1.5">
                              {items?.length ? items.map((item: FinanceItem, idx: number) => (
                                <div key={idx} className={`flex items-center gap-2 p-2 rounded-xl ${tone.bg} border ${tone.border}`}>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-default-700 truncate">{item.label}</p>
                                    <p className="text-[10px] text-default-400">{item.category}</p>
                                  </div>
                                  <span className={`ml-auto tnum text-xs font-bold ${tone.text}`}>
                                    {money(item.amount)}
                                  </span>
                                </div>
                              )) : <p className="text-xs text-default-400 italic">No disponible</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button color="danger" variant="light" onPress={onClose}>Cerrar</Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* ── MODAL: ajustes de datos ─────────────────────────── */}
        <Modal isOpen={isDataModalOpen} onOpenChange={onDataModalChange} backdrop="blur">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">Ajustes</ModalHeader>
                <ModalBody className="pb-6">
                  {/* ── Seguridad ─────────────────────────────── */}
                  <p className="text-xs font-bold uppercase tracking-wider text-default-400">Seguridad</p>
                  <Button
                    color={lockOn ? "success" : "default"}
                    variant="flat"
                    startContent={<Fingerprint size={18} />}
                    isDisabled={!bioAvailable && !lockOn}
                    onPress={toggleBiometricLock}
                    className="justify-start"
                  >
                    {lockOn ? "Bloqueo biométrico: ACTIVADO (toca para quitar)" : "Activar bloqueo con huella / Face ID"}
                  </Button>
                  {!bioAvailable && !lockOn && (
                    <p className="text-[11px] text-default-400 -mt-1">
                      Este dispositivo no tiene huella/Face ID disponible (o el sitio no está en HTTPS).
                    </p>
                  )}

                  {/* ── Notificaciones ────────────────────────── */}
                  <p className="text-xs font-bold uppercase tracking-wider text-default-400 mt-2">Recordatorios</p>
                  <Button
                    color={pushStatus === "on" ? "success" : "default"}
                    variant="flat"
                    startContent={pushStatus === "on" ? <Bell size={18} /> : <BellOff size={18} />}
                    isDisabled={pushStatus === "unsupported" || pushStatus === "denied" || pushBusy}
                    isLoading={pushBusy}
                    onPress={togglePush}
                    className="justify-start"
                  >
                    {pushStatus === "on" ? "Recordatorios: ACTIVADOS (toca para quitar)"
                      : pushStatus === "denied" ? "Notificaciones bloqueadas en el navegador"
                      : pushStatus === "unsupported" ? "Este navegador no soporta notificaciones"
                      : "Activar recordatorios de corte y pago"}
                  </Button>
                  <p className="text-[11px] text-default-400 -mt-1">
                    Te avisamos 3 días antes, 1 día antes y el día de tu fecha límite de pago, y un día antes del corte.
                  </p>

                  {/* ── Datos ─────────────────────────────────── */}
                  <p className="text-xs font-bold uppercase tracking-wider text-default-400 mt-2">Datos</p>
                  <p className="text-sm text-default-500 mb-2">
                    Exporta tus datos como un archivo JSON de respaldo, o importa un archivo previamente exportado.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Button
                      color="primary"
                      variant="flat"
                      startContent={<Download size={18} />}
                      onPress={() => { exportData(); onClose(); }}
                    >
                      Exportar Respaldo (.json)
                    </Button>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".json,application/json"
                        aria-label="Importar respaldo"
                        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                        onChange={(e) => { onImportFile(e); onClose(); }}
                      />
                      <Button
                        color="secondary"
                        variant="flat"
                        startContent={<Upload size={18} />}
                        className="w-full pointer-events-none"
                      >
                        Importar Respaldo
                      </Button>
                    </div>
                    <Button
                      color="danger"
                      variant="flat"
                      startContent={<Trash2 size={18} />}
                      onPress={() => { onClose(); onClearOpen(); }}
                    >
                      Limpiar Historial
                    </Button>
                  </div>
                </ModalBody>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* ── MODAL: confirmar limpiar historial ──────────────── */}
        <Modal isOpen={isClearOpen} onOpenChange={onClearChange} backdrop="blur" size="sm">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-500" />
                  Limpiar historial
                </ModalHeader>
                <ModalBody>
                  <p className="text-sm text-default-500">
                    Se eliminarán <span className="font-bold">{history.length}</span> snapshots guardados.
                    Esta acción no se puede deshacer.
                  </p>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>Cancelar</Button>
                  <Button color="danger" variant="shadow" className="font-bold" onPress={() => confirmClearHistory(onClose)}>
                    Sí, limpiar
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* ── MODAL: confirmar importación ────────────────────── */}
        <Modal isOpen={isImportOpen} onOpenChange={onImportChange} backdrop="blur" size="sm">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex items-center gap-2">
                  {importError
                    ? <><AlertTriangle size={18} className="text-rose-500" /> Archivo inválido</>
                    : <><Upload size={18} className="text-indigo-500" /> Importar respaldo</>}
                </ModalHeader>
                <ModalBody>
                  {importError ? (
                    <p className="text-sm text-default-500">{importError}</p>
                  ) : (
                    <>
                      <p className="text-sm text-default-500">
                        El respaldo contiene: <span className="font-semibold text-default-700">{importPreview?.counts}</span>
                      </p>
                      <p className="text-sm text-rose-500 font-semibold">
                        Esto reemplazará todos tus datos actuales.
                      </p>
                    </>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>{importError ? "Entendido" : "Cancelar"}</Button>
                  {!importError && (
                    <Button color="secondary" variant="shadow" className="font-bold" onPress={() => confirmImport(onClose)}>
                      Sí, importar
                    </Button>
                  )}
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* ── MODAL: conflicto de sincronización ──────────────── */}
        <Modal isOpen={conflictData !== null} onOpenChange={() => {}} backdrop="blur" size="sm" hideCloseButton isDismissable={false}>
          <ModalContent>
            <ModalHeader className="flex items-center gap-2">
              <RefreshCw size={18} className="text-indigo-500" />
              Datos actualizados en otro lugar
            </ModalHeader>
            <ModalBody>
              <p className="text-sm text-default-500">
                Guardaste cambios desde otro dispositivo o pestaña. Para no perder nada,
                cargaremos la versión más reciente.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button color="primary" variant="shadow" className="font-bold w-full" onPress={resolveConflict}>
                Cargar datos más recientes
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </SignedIn>
    </div>
  );
}
