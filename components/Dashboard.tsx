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
  Users,
  UserPlus,
  Copy,
  LogOut,
  Pencil,
  Repeat,
  ArrowLeftRight,
  Tag,
  Wand2,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import {
  FinanceItem, HistorySnapshot, SubscriptionItem, GoalItem,
  TransactionItem, CreditCardItem, BudgetItem, InstallmentPlan,
} from "@/types";
import { UserButton, SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { money, moneyExact, moneySmart, moneyParts, round2, loadPrivacyMode, setPrivacyMode } from "@/lib/format";
import { biometricsAvailable, isLockEnabled, enableLock, disableLock, verifyLock } from "@/lib/applock";
import { cardDebtBreakdown, monthKey, monthLabel, shiftMonth, summarizeMonth } from "@/lib/finance-utils";
import { pushSupported, getPushStatus, enablePush, disablePush } from "@/lib/push-client";
import Analytics from "./Analytics";
import Transactions from "./Transactions";
import CreditCards from "./CreditCards";
import Budgets from "./Budgets";
import UpcomingPayments from "./UpcomingPayments";
import VoiceAssistant from "./VoiceAssistant";
import AddedByBadge from "./AddedByBadge";
import AIChat from "./AIChat";
import AIInsights from "./AIInsights";
import CashflowTimeline from "./CashflowTimeline";
import PlanView from "./PlanView";
import TicketScanner from "./TicketScanner";
import { startTour } from "./Tutorial";

import { TONE, SECTION_TONE, type ToneName } from "./dashboard/tone";
import { useAnimatedCounter } from "./dashboard/useAnimatedCounter";
import { QUICK_CATEGORIES, type QuickAddType, type EditKind } from "./dashboard/quickAdd";
import { StatCard } from "./dashboard/StatCard";
import { DashboardSkeleton } from "./dashboard/DashboardSkeleton";
import { BottomNav, type NavTab } from "./dashboard/BottomNav";
import { Section } from "./dashboard/Section";
import { SubscriptionsSection } from "./dashboard/SubscriptionsSection";
import { GoalsSection } from "./dashboard/GoalsSection";
import { SaveIndicator, type SaveStatus } from "./dashboard/SaveIndicator";
import { SignedOutLanding } from "./dashboard/SignedOutLanding";
import { BiometricLockScreen } from "./dashboard/BiometricLockScreen";
import { LoadErrorView } from "./dashboard/LoadErrorView";
import { TopNav } from "./dashboard/TopNav";
import { HomeViewToggle } from "./dashboard/HomeViewToggle";
import { UndoToast } from "./dashboard/UndoToast";
import { BalanceHero } from "./dashboard/BalanceHero";
import { WelcomeCard } from "./dashboard/WelcomeCard";
import { DemoDataBanner } from "./dashboard/DemoDataBanner";
import { PendingFixedChargesCard } from "./dashboard/PendingFixedChargesCard";
import { HistoryTab } from "./dashboard/HistoryTab";
import { QuickAddModal } from "./dashboard/QuickAddModal";
import { TransferModal } from "./dashboard/TransferModal";
import { EditModal } from "./dashboard/EditModal";

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
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
  const [customExpenseCats, setCustomExpenseCats] = useState<string[]>([]);
  const [customIncomeCats,  setCustomIncomeCats]  = useState<string[]>([]);
  const [appSettings, setAppSettings] = useState<{ autoSnapshotDays: number; demoData: boolean }>({ autoSnapshotDays: 7, demoData: false });

  // ── Bloqueo biométrico ───────────────────────────────────────
  const [locked,        setLocked]        = useState(false);
  const [lockOn,        setLockOn]        = useState(false);
  const [bioAvailable,  setBioAvailable]  = useState(false);
  const [unlocking,     setUnlocking]     = useState(false);

  // ── Notificaciones push ──────────────────────────────────────
  const [pushStatus, setPushStatus] = useState<"on" | "off" | "denied" | "unsupported">("unsupported");
  const [pushBusy,   setPushBusy]   = useState(false);

  // ── Cuentas compartidas ──────────────────────────────────────
  const [members,      setMembers]      = useState<{ userId: string; name?: string; email?: string }[]>([]);
  const [docOwnerId,   setDocOwnerId]   = useState<string | null>(null);
  const [inviteCode,   setInviteCode]   = useState<string | null>(null);
  const [joinCode,     setJoinCode]     = useState("");
  const [shareBusy,    setShareBusy]    = useState(false);
  const [shareError,   setShareError]   = useState<string | null>(null);
  const [leaveArmed,   setLeaveArmed]   = useState(false);
  const [codeCopied,   setCodeCopied]   = useState(false);

  const { user } = useUser();
  const isSharedMember = !!(docOwnerId && user?.id && docOwnerId !== user.id);

  // Autoría: se sella en cada registro nuevo (visible en cuentas compartidas)
  const author = user?.id
    ? { userId: user.id, name: user.firstName || user.fullName || user.username || "Alguien" }
    : undefined;
  const [mounted,       setMounted]       = useState(false);
  const [isLoading,     setIsLoading]     = useState(true);
  const [loadError,     setLoadError]     = useState(false);
  const [activeTab,     setActiveTab]     = useState<NavTab>("dashboard");
  // Inicio tiene dos caras: "Este mes" (hoy) y "Plan" (un mes futuro)
  const [planMode,      setPlanMode]      = useState(false);
  const [planMonthKey,  setPlanMonthKey]  = useState(() => shiftMonth(monthKey(new Date()), 1));
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
    setCustomExpenseCats(data.customExpenseCats || []);
    setCustomIncomeCats(data.customIncomeCats || []);
    setAppSettings({
      autoSnapshotDays: data.settings?.autoSnapshotDays || 7,
      demoData: data.settings?.demoData === true,
    });
    setMembers(data.members || []);
    setDocOwnerId(data.userId || null);
    revRef.current = typeof data.rev === "number" ? data.rev : 0;
  }, []);

  // Con el candado puesto, el documento no debe poder desplazarse:
  // si no, se alcanza a ver (y a arrastrar) el contenido de atras.
  useEffect(() => {
    if (!locked) return;
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [locked]);

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

  // ── Cuentas compartidas: handlers ────────────────────────────
  const shareCall = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  };

  const generateInvite = async () => {
    setShareBusy(true);
    setShareError(null);
    try {
      const { ok, data } = await shareCall({ action: "invite" });
      if (ok && data.code) setInviteCode(data.code);
      else setShareError("No se pudo generar el código. Intenta de nuevo.");
    } finally {
      setShareBusy(false);
    }
  };

  const copyInvite = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch { /* clipboard no disponible */ }
  };

  const joinShared = async () => {
    if (!joinCode.trim()) return;
    setShareBusy(true);
    setShareError(null);
    try {
      const { ok, data } = await shareCall({
        action: "join",
        code: joinCode.trim(),
        name: user?.fullName || user?.username || "",
        email: user?.primaryEmailAddress?.emailAddress || "",
      });
      if (ok) {
        window.location.reload(); // cargar las cuentas compartidas
      } else {
        setShareError(
          data?.error === "invalid_or_expired" ? "Código inválido o vencido."
          : data?.error === "own_code" ? "Ese código es tuyo — compártelo con la otra persona."
          : data?.error === "full" ? "Ese grupo ya está lleno."
          : data?.error === "has_members" ? "Ya tienes miembros en tus cuentas; no puedes unirte a otras."
          : "No se pudo unir. Revisa el código.",
        );
      }
    } finally {
      setShareBusy(false);
    }
  };

  const leaveShared = async () => {
    if (!leaveArmed) {
      setLeaveArmed(true);
      setTimeout(() => setLeaveArmed(false), 4000);
      return;
    }
    setShareBusy(true);
    try {
      await shareCall({ action: "leave" });
      window.location.reload(); // regresar a mis cuentas personales
    } finally {
      setShareBusy(false);
    }
  };

  const removeMember = async (memberId: string) => {
    setShareBusy(true);
    try {
      const { ok } = await shareCall({ action: "remove", memberId });
      if (ok) setMembers((prev) => prev.filter((m) => m.userId !== memberId));
    } finally {
      setShareBusy(false);
    }
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
    customExpenseCats: string[]; customIncomeCats: string[];
    settings: { autoSnapshotDays: number; demoData: boolean };
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
      () => saveData({ assets, liabilities, buckets, history, subscriptions, goals, transactions, creditCards, budgets, installments, customExpenseCats, customIncomeCats, settings: appSettings }),
      900,
    );
    return () => clearTimeout(timer);
  }, [assets, liabilities, buckets, history, subscriptions, goals, transactions, creditCards, budgets, installments, customExpenseCats, customIncomeCats, appSettings, mounted, isLoading, loadError, saveData]);

  // ── Totales ──────────────────────────────────────────────────
  const totalAssets      = round2(assets.reduce((s, i) => s + i.amount, 0));
  const totalLiabilities = round2(liabilities.reduce((s, i) => s + i.amount, 0));
  const totalBuckets     = round2(buckets.reduce((s, i) => s + i.amount, 0));
  const totalFixedCosts  = round2(subscriptions.reduce(
    (s, i) => s + (i.billingCycle === "anual" ? i.amount / 12 : i.amount), 0,
  ));
  const available        = round2(totalAssets - totalLiabilities - totalBuckets);

  // Mensualidad MSI activa por tarjeta (para el descuento al capturar
  // totales y para el disponible real del héroe)
  const msiMonthlyByCard: Record<string, number> = Object.fromEntries(
    creditCards.map((c) => [c.id, cardDebtBreakdown(c, installments).monthlyInstallment]),
  );
  const totalMsiMonthly = round2(Object.values(msiMonthlyByCard).reduce((s, v) => s + v, 0));

  // EL número: lo que de verdad queda tras deudas, gastos fijos y MSI del mes
  const afterThisMonth = round2(available - totalFixedCosts - totalMsiMonthly);

  const animatedAvailable = useAnimatedCounter(afterThisMonth);
  const isPositive        = afterThisMonth >= 0;
  const balanceProgress   = totalAssets > 0
    ? Math.max(0, Math.min(100, (afterThisMonth / totalAssets) * 100))
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
  /**
   * Botón "Pagado": la deuda de contado queda en $0 y los gastos
   * vinculados a esa tarjeta salen de la lista (ya se pagaron).
   * Todo reversible con Deshacer.
   */
  const markCardPaid = (cardId: string) => {
    const card = creditCards.find((c) => c.id === cardId);
    if (!card) return;
    const prevBalance = card.balance || 0;
    const linked = liabilities.filter((l) => l.cardId === cardId);

    setCreditCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, balance: 0 } : c)));
    if (linked.length) setLiabilities((prev) => prev.filter((l) => l.cardId !== cardId));

    scheduleUndo(`Pago de ${card.label}`, () => {
      setCreditCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, balance: prevBalance } : c)));
      if (linked.length) setLiabilities((prev) => [...prev, ...linked]);
    });
  };

  /** Suma (o resta con signo negativo) a la deuda de contado de una tarjeta */
  const bumpCardBalance = (cardId: string, delta: number) => {
    setCreditCards((prev) => prev.map((c) =>
      c.id === cardId ? { ...c, balance: Math.max(0, round2((c.balance || 0) + delta)) } : c,
    ));
  };

  const handleAddItem = (type: QuickAddType, label: string, amount: string, date: string, category: string, cardId?: string) => {
    const parsed = parseFloat(amount);
    if (!label || !Number.isFinite(parsed) || parsed <= 0) return;
    const rounded = round2(parsed);
    const item: FinanceItem = {
      id: crypto.randomUUID(),
      label,
      amount: rounded,
      date: date || new Date().toISOString().split("T")[0],
      type,
      category,
      ...(type === "liability" && cardId ? { cardId } : {}),
      addedBy: author,
    };
    if (type === "asset")     setAssets((prev) => [...prev, item]);
    if (type === "bucket")    setBuckets((prev) => [...prev, item]);
    if (type === "liability") {
      setLiabilities((prev) => [...prev, item]);
      // El gasto también engorda la deuda de la tarjeta
      if (cardId) bumpCardBalance(cardId, rounded);
    }
  };

  const removeItem = (id: string, type: QuickAddType) => {
    const lists = { asset: assets, liability: liabilities, bucket: buckets };
    const setters = { asset: setAssets, liability: setLiabilities, bucket: setBuckets };
    const list = lists[type];
    const idx = list.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const item = list[idx];
    setters[type](list.filter((i) => i.id !== id));

    // Quitar un gasto de tarjeta = ya lo pagaste → baja la deuda
    if (type === "liability" && item.cardId) bumpCardBalance(item.cardId, -item.amount);

    scheduleUndo(item.label, () => {
      setters[type]((prev) => {
        const next = [...prev];
        next.splice(Math.min(idx, next.length), 0, item);
        return next;
      });
      if (type === "liability" && item.cardId) bumpCardBalance(item.cardId, item.amount);
    });
  };

  const handleAddSubscription = (label: string, amount: string, billingCycle: "mensual" | "anual", category: string) => {
    const parsed = parseFloat(amount);
    if (!label || !Number.isFinite(parsed) || parsed <= 0) return;
    setSubscriptions((prev) => [...prev, {
      id: crypto.randomUUID(), label, amount: round2(parsed), billingCycle, category, addedBy: author,
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
      id: crypto.randomUUID(), label, targetAmount: round2(parsed), currentAmount: 0, deadline, addedBy: author,
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
  /** Un movimiento ligado a cuenta mueve el saldo de ese activo:
   *  gasto lo baja, ingreso lo sube. dir=-1 revierte el efecto. */
  const applyTxToAccount = (t: { accountId?: string; type: "expense" | "income"; amount: number }, dir: 1 | -1) => {
    if (!t.accountId) return;
    const delta = dir * (t.type === "income" ? t.amount : -t.amount);
    setAssets((prev) => prev.map((a) =>
      a.id === t.accountId ? { ...a, amount: Math.max(0, round2(a.amount + delta)) } : a,
    ));
  };

  const addTransaction = (t: Omit<TransactionItem, "id">) => {
    setTransactions((prev) => [...prev, { ...t, id: crypto.randomUUID(), addedBy: author }]);
    applyTxToAccount(t, 1);
  };

  const removeTransaction = (id: string) => {
    const idx = transactions.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const item = transactions[idx];
    setTransactions(transactions.filter((i) => i.id !== id));
    applyTxToAccount(item, -1);
    scheduleUndo(item.label, () => {
      setTransactions((prev) => {
        const next = [...prev];
        next.splice(Math.min(idx, next.length), 0, item);
        return next;
      });
      applyTxToAccount(item, 1);
    });
  };

  // ── Tarjetas de crédito ──────────────────────────────────────
  const addCreditCard = (c: Omit<CreditCardItem, "id">) => {
    setCreditCards((prev) => [...prev, { ...c, id: crypto.randomUUID(), addedBy: author }]);
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

  // ── Compras a meses sin intereses ────────────────────────────
  const addInstallment = (p: Omit<InstallmentPlan, "id">) => {
    setInstallments((prev) => [...prev, { ...p, id: crypto.randomUUID(), addedBy: author }]);
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
    setBudgets((prev) => [...prev, { ...b, id: crypto.randomUUID(), addedBy: author }]);
  };

  const removeBudget = (id: string) => {
    setBudgets(budgets.filter((i) => i.id !== id));
  };

  // ── EDICIÓN DE REGISTROS ─────────────────────────────────────
  const [editTarget, setEditTarget] = useState<{ kind: EditKind; id: string } | null>(null);
  const [eLabel, setELabel] = useState("");
  const [eAmount, setEAmount] = useState("");
  const [eDate, setEDate] = useState("");
  const [eCategory, setECategory] = useState("");
  const [eCycle, setECycle] = useState<"mensual" | "anual">("mensual");
  const [eTarget, setETarget] = useState("");
  const [eCurrent, setECurrent] = useState("");
  const [eDeadline, setEDeadline] = useState("");

  const openEditItem = (kind: "asset" | "liability" | "bucket", id: string) => {
    const list = kind === "asset" ? assets : kind === "liability" ? liabilities : buckets;
    const item = list.find((i) => i.id === id);
    if (!item) return;
    setELabel(item.label);
    setEAmount(String(item.amount));
    setEDate(item.date || "");
    setECategory(item.category || QUICK_CATEGORIES[kind][0]);
    setEditTarget({ kind, id });
  };

  const openEditSub = (id: string) => {
    const item = subscriptions.find((i) => i.id === id);
    if (!item) return;
    setELabel(item.label);
    setEAmount(String(item.amount));
    setECycle(item.billingCycle);
    setEditTarget({ kind: "sub", id });
  };

  const openEditGoal = (id: string) => {
    const item = goals.find((i) => i.id === id);
    if (!item) return;
    setELabel(item.label);
    setETarget(String(item.targetAmount));
    setECurrent(String(item.currentAmount));
    setEDeadline(item.deadline);
    setEditTarget({ kind: "goal", id });
  };

  const saveEdit = () => {
    if (!editTarget) return;
    const { kind, id } = editTarget;

    if (kind === "asset" || kind === "liability" || kind === "bucket") {
      const parsed = round2(parseFloat(eAmount));
      if (!eLabel.trim() || !Number.isFinite(parsed) || parsed <= 0) return;
      const setters = { asset: setAssets, liability: setLiabilities, bucket: setBuckets } as const;
      const list = kind === "asset" ? assets : kind === "liability" ? liabilities : buckets;
      const prev = list.find((i) => i.id === id);
      // Gasto ligado a tarjeta: la deuda se ajusta por la DIFERENCIA
      if (kind === "liability" && prev?.cardId && prev.amount !== parsed) {
        bumpCardBalance(prev.cardId, parsed - prev.amount);
      }
      setters[kind]((prevList) => prevList.map((i) =>
        i.id === id ? { ...i, label: eLabel.trim(), amount: parsed, date: eDate, category: eCategory } : i,
      ));
    }

    if (kind === "sub") {
      const parsed = round2(parseFloat(eAmount));
      if (!eLabel.trim() || !Number.isFinite(parsed) || parsed <= 0) return;
      setSubscriptions((prev) => prev.map((i) =>
        i.id === id ? { ...i, label: eLabel.trim(), amount: parsed, billingCycle: eCycle } : i,
      ));
    }

    if (kind === "goal") {
      const target = round2(parseFloat(eTarget));
      const current = round2(parseFloat(eCurrent) || 0);
      if (!eLabel.trim() || !Number.isFinite(target) || target <= 0 || !eDeadline) return;
      setGoals((prev) => prev.map((i) =>
        i.id === id ? { ...i, label: eLabel.trim(), targetAmount: target, currentAmount: Math.max(0, current), deadline: eDeadline } : i,
      ));
    }

    setEditTarget(null);
  };

  const updateTransaction = (id: string, patch: Partial<TransactionItem>) => {
    const prev = transactions.find((t) => t.id === id);
    if (prev) {
      const next = { ...prev, ...patch };
      // Revertir el efecto anterior y aplicar el nuevo (cuenta/monto/tipo pueden cambiar)
      applyTxToAccount(prev, -1);
      applyTxToAccount(next, 1);
    }
    setTransactions((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const updateCreditCardInfo = (id: string, patch: Partial<CreditCardItem>) => {
    setCreditCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const updateInstallmentInfo = (id: string, patch: Partial<InstallmentPlan>) => {
    setInstallments((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const updateBudgetLimit = (id: string, monthlyLimit: number) => {
    setBudgets((prev) => prev.map((b) => (b.id === id ? { ...b, monthlyLimit } : b)));
  };

  // ── Transferencias entre cuentas (activos) ───────────────────
  const { isOpen: isTransferOpen, onOpen: onTransferOpen, onOpenChange: onTransferChange } = useDisclosure();
  const [tFrom, setTFrom] = useState("");
  const [tTo, setTTo] = useState("");
  const [tAmount, setTAmount] = useState("");

  const doTransfer = (close: () => void) => {
    const amount = round2(parseFloat(tAmount));
    const from = assets.find((a) => a.id === tFrom);
    const to = assets.find((a) => a.id === tTo);
    if (!from || !to || from.id === to.id || !Number.isFinite(amount) || amount <= 0 || amount > from.amount) return;
    setAssets((prev) => prev.map((a) =>
      a.id === from.id ? { ...a, amount: round2(a.amount - amount) }
      : a.id === to.id ? { ...a, amount: round2(a.amount + amount) }
      : a,
    ));
    scheduleUndo(`Transferencia ${money(amount)}`, () => {
      setAssets((prev) => prev.map((a) =>
        a.id === from.id ? { ...a, amount: round2(a.amount + amount) }
        : a.id === to.id ? { ...a, amount: round2(a.amount - amount) }
        : a,
      ));
    });
    setTAmount("");
    close();
  };

  // ── Categorías personalizadas ────────────────────────────────
  const [newCatE, setNewCatE] = useState("");
  const [newCatI, setNewCatI] = useState("");

  const addCustomCat = (kind: "expense" | "income") => {
    const value = (kind === "expense" ? newCatE : newCatI).trim();
    if (!value) return;
    const setter = kind === "expense" ? setCustomExpenseCats : setCustomIncomeCats;
    setter((prev) => (prev.some((c) => c.toLowerCase() === value.toLowerCase()) ? prev : [...prev, value].slice(0, 30)));
    kind === "expense" ? setNewCatE("") : setNewCatI("");
  };

  // ── Datos de ejemplo (onboarding) ────────────────────────────
  const [demoDismissed, setDemoDismissed] = useState(false);
  const isEmpty = !isLoading && !loadError &&
    assets.length + liabilities.length + buckets.length + subscriptions.length +
    goals.length + transactions.length + creditCards.length === 0;

  const loadDemoData = () => {
    const today = new Date();
    const iso = (d: Date) => d.toISOString().split("T")[0];
    const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
    const monthsFromNow = (n: number) => { const d = new Date(today); d.setMonth(d.getMonth() + n); return d; };
    const uid = () => crypto.randomUUID();

    const cardId = uid();
    const acc1 = uid();
    setAssets([
      { id: acc1, label: "BBVA Débito (ejemplo)", amount: 8500, date: iso(today), type: "asset", category: "Banco" },
      { id: uid(), label: "Efectivo (ejemplo)", amount: 1200, date: iso(today), type: "asset", category: "Efectivo" },
    ]);
    setBuckets([
      { id: uid(), label: "Fondo emergencia (ejemplo)", amount: 2000, date: iso(today), type: "bucket", category: "Emergencia" },
    ]);
    setCreditCards([
      { id: cardId, label: "Nu (ejemplo)", balance: 2350, creditLimit: 20000, cutoffDay: 18, dueDay: 28, apr: 65, minPayment: 0 },
    ]);
    setInstallments([
      { id: uid(), cardId, label: "Pantalla (ejemplo)", totalAmount: 6000, months: 6, startDate: iso(daysAgo(65)) },
    ]);
    setSubscriptions([
      { id: uid(), label: "Netflix (ejemplo)", amount: 219, billingCycle: "mensual", category: "Suscripción" },
      { id: uid(), label: "Spotify (ejemplo)", amount: 129, billingCycle: "mensual", category: "Suscripción" },
    ]);
    setGoals([
      { id: uid(), label: "Viaje (ejemplo)", targetAmount: 15000, currentAmount: 3500, deadline: iso(monthsFromNow(6)) },
    ]);
    setBudgets([
      { id: uid(), category: "Comida", monthlyLimit: 3000 },
      { id: uid(), category: "Transporte", monthlyLimit: 1500 },
    ]);
    setTransactions([
      { id: uid(), label: "Nómina (ejemplo)", amount: 9500, date: iso(daysAgo(10)), type: "income", category: "Nómina", source: "manual" },
      { id: uid(), label: "Súper (ejemplo)", amount: 780, date: iso(daysAgo(6)), type: "expense", category: "Súper", source: "manual", accountId: acc1 },
      { id: uid(), label: "Tacos (ejemplo)", amount: 185, date: iso(daysAgo(4)), type: "expense", category: "Comida", source: "manual" },
      { id: uid(), label: "Gasolina (ejemplo)", amount: 600, date: iso(daysAgo(3)), type: "expense", category: "Transporte", source: "manual", accountId: acc1 },
      { id: uid(), label: "Cine (ejemplo)", amount: 240, date: iso(daysAgo(1)), type: "expense", category: "Entretenimiento", source: "manual" },
      { id: uid(), label: "Comida corrida (ejemplo)", amount: 1450, date: iso(daysAgo(20)), type: "expense", category: "Comida", source: "manual" },
      { id: uid(), label: "Nómina (ejemplo)", amount: 9500, date: iso(daysAgo(40)), type: "income", category: "Nómina", source: "manual" },
      { id: uid(), label: "Ropa (ejemplo)", amount: 899, date: iso(daysAgo(35)), type: "expense", category: "Ropa", source: "manual" },
    ]);
    setAppSettings((s) => ({ ...s, demoData: true }));
  };

  const clearDemoData = () => {
    setAssets([]); setLiabilities([]); setBuckets([]); setSubscriptions([]);
    setGoals([]); setTransactions([]); setCreditCards([]); setInstallments([]);
    setBudgets([]); setHistory([]);
    setAppSettings((s) => ({ ...s, demoData: false }));
    setDemoDismissed(true);
  };

  // ── GASTOS FIJOS AUTOMÁTICOS ─────────────────────────────────
  const currentMonthKey = monthKey(new Date());
  const [fixedDismissed, setFixedDismissed] = useState(true);

  useEffect(() => {
    try {
      setFixedDismissed(localStorage.getItem(`fc_fixed_skip_${currentMonthKey}`) === "1");
    } catch { setFixedDismissed(false); }
  }, [currentMonthKey]);

  const pendingFixed = subscriptions.filter((s) =>
    s.billingCycle === "mensual" &&
    !transactions.some((t) => t.subId === s.id && monthKey(t.date) === currentMonthKey),
  );
  const pendingFixedTotal = round2(pendingFixed.reduce((s, i) => s + i.amount, 0));

  const registerFixedCharges = () => {
    const today = new Date().toISOString().split("T")[0];
    setTransactions((prev) => [
      ...prev,
      ...pendingFixed.map((s) => ({
        id: crypto.randomUUID(),
        label: s.label,
        amount: s.amount,
        date: today,
        type: "expense" as const,
        category: s.category || "Suscripción",
        source: "fixed" as const,
        subId: s.id,
        addedBy: author,
      })),
    ]);
  };

  const dismissFixedCharges = () => {
    setFixedDismissed(true);
    try { localStorage.setItem(`fc_fixed_skip_${currentMonthKey}`, "1"); } catch { /* noop */ }
  };

  // ── Modales ──────────────────────────────────────────────────
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isDataModalOpen, onOpen: onDataModalOpen, onOpenChange: onDataModalChange } = useDisclosure();
  const { isOpen: isQuickAddOpen, onOpen: onQuickAddOpen, onOpenChange: onQuickAddChange } = useDisclosure();
  const { isOpen: isClearOpen, onOpen: onClearOpen, onOpenChange: onClearChange } = useDisclosure();
  const { isOpen: isImportOpen, onOpen: onImportOpen, onOpenChange: onImportChange } = useDisclosure();
  const { isOpen: isVoiceOpen, onOpen: onVoiceOpen, onOpenChange: onVoiceChange } = useDisclosure();
  const { isOpen: isScannerOpen, onOpen: onScannerOpen, onOpenChange: onScannerChange } = useDisclosure();
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);

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
      <TopNav
        activeTab={activeTab}
        onChangeTab={changeTab}
        saveStatus={saveStatus}
        privacy={privacy}
        onTogglePrivacy={togglePrivacy}
        onVoiceOpen={onVoiceOpen}
        onStartTour={handleStartTour}
      />

      {/* ── SIGNED OUT ────────────────────────────────────────── */}
      <SignedOut>
        <SignedOutLanding />
      </SignedOut>

      {/* ── SIGNED IN ─────────────────────────────────────────── */}
      <SignedIn>
        {/* ── CANDADO BIOMÉTRICO ──────────────────────────────── */}
        {locked && (
          <BiometricLockScreen unlocking={unlocking} onUnlock={handleUnlock} />
        )}

        {isLoading ? (
          <DashboardSkeleton />
        ) : loadError ? (
          <LoadErrorView />
        ) : (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8 pb-28 md:pb-8">

          {/* ── ESTE MES | PLAN ───────────────────────────────── */}
          {activeTab === "dashboard" && (
            <HomeViewToggle planMode={planMode} setPlanMode={setPlanMode} planMonthKey={planMonthKey} />
          )}

          {planMode && activeTab === "dashboard" ? (
            <PlanView
              month={planMonthKey}
              onMonthChange={setPlanMonthKey}
              minMonth={shiftMonth(currentMonthKey, 1)}
              maxMonth={shiftMonth(currentMonthKey, 3)}
              transactions={transactions}
              subscriptions={subscriptions}
              installments={installments}
              cards={creditCards}
              accounts={assets}
              startBalance={afterThisMonth}
              onAddTransaction={addTransaction}
              onRemoveTransaction={removeTransaction}
              onUpdateTransaction={updateTransaction}
              onUpdateInstallment={updateInstallmentInfo}
              extraExpenseCats={customExpenseCats}
              extraIncomeCats={customIncomeCats}
              viewerId={user?.id}
            />
          ) : (
          <section className="animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

              <BalanceHero
                isPositive={isPositive}
                animatedAvailable={animatedAvailable}
                transactions={transactions}
                currentMonthKey={currentMonthKey}
                totalAssets={totalAssets}
                totalLiabilities={totalLiabilities}
                totalFixedCosts={totalFixedCosts}
                totalMsiMonthly={totalMsiMonthly}
                balanceProgress={balanceProgress}
                onSaveSnapshot={saveSnapshot}
                onViewHistory={() => changeTab("history")}
                onOpenSettings={onDataModalOpen}
              />

              <div className="col-span-1 md:col-span-4 grid grid-cols-3 md:flex md:flex-col gap-2 md:gap-3">
                <StatCard label="Total Activos"  value={totalAssets}      icon={<TrendingUp size={20} />}   tone="emerald" delay={100} />
                <StatCard label="Gastos / Deudas" value={totalLiabilities} icon={<TrendingDown size={20} />} tone="rose"    delay={200} />
                <StatCard label="Apartados"       value={totalBuckets}     icon={<Wallet size={20} />}       tone="amber"   delay={300} />
              </div>
            </div>
          </section>
          )}

          <div id="tab-content" style={{ scrollMarginTop: "72px" }} />

          {/* ── BIENVENIDA / DATOS DE EJEMPLO ─────────────────── */}
          {activeTab === "dashboard" && !planMode && isEmpty && !demoDismissed && (
            <WelcomeCard onLoadDemo={loadDemoData} onDismiss={() => setDemoDismissed(true)} />
          )}

          {appSettings.demoData && (
            <DemoDataBanner onClear={clearDemoData} />
          )}

          {/* ── GASTOS FIJOS DEL MES PENDIENTES ───────────────── */}
          {activeTab === "dashboard" && !planMode && pendingFixed.length > 0 && !fixedDismissed && (
            <PendingFixedChargesCard
              pendingFixed={pendingFixed}
              pendingFixedTotal={pendingFixedTotal}
              currentMonthKey={currentMonthKey}
              onDismiss={dismissFixedCharges}
              onRegister={registerFixedCharges}
            />
          )}

          {/* ── POR PAGAR (siempre visible en Inicio) ─────────── */}
          {activeTab === "dashboard" && !planMode && (
            <UpcomingPayments cards={creditCards} subscriptions={subscriptions} installments={installments} />
          )}

          {/* ── MIS FINANZAS ──────────────────────────────────── */}
          <section className={activeTab !== "dashboard" || planMode ? "hidden" : ""} id="management-sections">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-xl font-bold section-title">Mis Finanzas</h2>
              {assets.length >= 2 && (
                <Button size="sm" variant="flat" color="primary" className="font-bold"
                  startContent={<ArrowLeftRight size={14} />} onPress={onTransferOpen}>
                  Transferir entre cuentas
                </Button>
              )}
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
                viewerId={user?.id}
                onEdit={(id) => openEditItem("asset", id)}
              />
              <Section
                title="Gastos & Deudas"
                description="Tarjetas, préstamos, pendientes"
                icon={<ShieldAlert size={18} />}
                items={liabilities}
                total={totalLiabilities}
                color="danger"
                categories={QUICK_CATEGORIES.liability}
                onAdd={(l, a, d, c, cardId) => handleAddItem("liability", l, a, d, c, cardId)}
                onRemove={(id) => removeItem(id, "liability")}
                cards={creditCards}
                msiMonthly={msiMonthlyByCard}
                viewerId={user?.id}
                onEdit={(id) => openEditItem("liability", id)}
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
                viewerId={user?.id}
                onEdit={(id) => openEditItem("bucket", id)}
              />
              <SubscriptionsSection
                items={subscriptions}
                total={totalFixedCosts}
                onAdd={handleAddSubscription}
                onRemove={removeSubscription}
                viewerId={user?.id}
                onEdit={openEditSub}
              />
              <CreditCards
                cards={creditCards}
                installments={installments}
                liabilities={liabilities}
                onAdd={addCreditCard}
                onRemove={removeCreditCard}
                onUpdateBalance={updateCardBalance}
                onAddInstallment={addInstallment}
                onRemoveInstallment={removeInstallment}
                onMarkPaid={markCardPaid}
                onUpdateCard={updateCreditCardInfo}
                onUpdateInstallment={updateInstallmentInfo}
                viewerId={user?.id}
              />
              <Budgets
                budgets={budgets}
                transactions={transactions}
                onAdd={addBudget}
                onRemove={removeBudget}
                onUpdateLimit={updateBudgetLimit}
                extraCategories={customExpenseCats}
                viewerId={user?.id}
              />
              <GoalsSection
                items={goals}
                onAdd={handleAddGoal}
                onRemove={removeGoal}
                onUpdateProgress={updateGoalProgress}
                viewerId={user?.id}
                onEdit={openEditGoal}
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
              onUpdate={updateTransaction}
              viewerId={user?.id}
              onScanRequest={onScannerOpen}
              accounts={assets}
              extraExpenseCats={customExpenseCats}
              extraIncomeCats={customIncomeCats}
            />
          </section>

          {/* ── ANALYTICS ─────────────────────────────────────── */}
          <section className={activeTab !== "analytics" ? "hidden" : ""}>
            <Divider className="my-2" />
            <div className="space-y-4">
              <CashflowTimeline
                cards={creditCards}
                subscriptions={subscriptions}
                installments={installments}
                startBalance={available}
                transactions={transactions}
              />
              <Analytics history={history} assets={assets} liabilities={liabilities} isDark={isDark} />
            </div>
          </section>

          {/* ── FINANCE AI ────────────────────────────────────── */}
          <section className={activeTab !== "ai" ? "hidden" : ""}>
            <Divider className="my-2" />
            <div className="space-y-4">
              <AIInsights
                data={{ assets, liabilities, buckets, subscriptions, goals, transactions, creditCards, installments, budgets }}
                onAskAI={(p) => setAiPrompt(p)}
              />
              <AIChat queuedPrompt={aiPrompt} onPromptConsumed={() => setAiPrompt(null)} />
            </div>
          </section>

          {/* ── HISTORIAL ─────────────────────────────────────── */}
          <HistoryTab activeTab={activeTab} history={history} onClearOpen={onClearOpen} onOpenDetails={openHistoryDetails} />
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
          <UndoToast label={pendingUndo.label} onUndo={handleUndo} />
        )}

        {/* ── MODAL: captura rápida (FAB) ─────────────────────── */}
        <QuickAddModal
          isOpen={isQuickAddOpen}
          onOpenChange={onQuickAddChange}
          onSubmit={submitQuickAdd}
          quickType={quickType}
          setQuickType={setQuickType}
          quickLabel={quickLabel}
          setQuickLabel={setQuickLabel}
          quickAmount={quickAmount}
          setQuickAmount={setQuickAmount}
          quickCategory={quickCategory}
          setQuickCategory={setQuickCategory}
          quickAmountValid={quickAmountValid}
        />

        {/* ── MODAL: transferir entre cuentas ─────────────────── */}
        <TransferModal
          isOpen={isTransferOpen}
          onOpenChange={onTransferChange}
          onTransfer={doTransfer}
          assets={assets}
          tFrom={tFrom}
          setTFrom={setTFrom}
          tTo={tTo}
          setTTo={setTTo}
          tAmount={tAmount}
          setTAmount={setTAmount}
        />

        {/* ── MODAL: editar registro ──────────────────────────── */}
        <EditModal
          editTarget={editTarget}
          setEditTarget={setEditTarget}
          liabilities={liabilities}
          onSave={saveEdit}
          eLabel={eLabel}
          setELabel={setELabel}
          eAmount={eAmount}
          setEAmount={setEAmount}
          eDate={eDate}
          setEDate={setEDate}
          eCategory={eCategory}
          setECategory={setECategory}
          eCycle={eCycle}
          setECycle={setECycle}
          eTarget={eTarget}
          setETarget={setETarget}
          eCurrent={eCurrent}
          setECurrent={setECurrent}
          eDeadline={eDeadline}
          setEDeadline={setEDeadline}
        />

        {/* ── MODAL: escáner de tickets (IA gratuita) ─────────── */}
        <TicketScanner
          isOpen={isScannerOpen}
          onOpenChange={onScannerChange}
          onConfirm={(t) => {
            addTransaction(t);
            changeTab("transactions");
          }}
        />

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

                  {/* ── Cuentas compartidas ───────────────────── */}
                  <p className="text-xs font-bold uppercase tracking-wider text-default-400 mt-2">Cuentas compartidas</p>

                  {isSharedMember ? (
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 space-y-2">
                      <p className="text-sm text-default-600 flex items-center gap-2">
                        <Users size={15} className="text-cyan-500 shrink-0" />
                        Estás viendo <span className="font-bold">cuentas compartidas</span> de otra persona.
                      </p>
                      <p className="text-[11px] text-default-400">
                        Tus datos personales se conservan y regresan cuando salgas.
                      </p>
                      <Button
                        size="sm" color="danger" variant="flat"
                        startContent={<LogOut size={14} />}
                        isLoading={shareBusy}
                        onPress={leaveShared}
                      >
                        {leaveArmed ? "¿Seguro? Toca de nuevo para salir" : "Salir de estas cuentas"}
                      </Button>
                    </div>
                  ) : (
                    <>
                      {members.length > 0 && (
                        <div className="space-y-1.5">
                          {members.map((m) => (
                            <div key={m.userId} className="flex items-center gap-2 p-2 rounded-xl bg-default-100/60 border border-default-200/50">
                              <Users size={13} className="text-cyan-500 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-default-700 truncate">{m.name || "Sin nombre"}</p>
                                {m.email && <p className="text-[10px] text-default-400 truncate">{m.email}</p>}
                              </div>
                              <button
                                onClick={() => removeMember(m.userId)}
                                className="p-1.5 rounded-lg text-default-300 hover:text-rose-500 hover:bg-rose-500/10 transition-all shrink-0"
                                aria-label={`Quitar a ${m.name || m.email || "miembro"}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {inviteCode ? (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5">
                          <p className="text-[11px] text-default-500">Comparte este código (vence en 72 h):</p>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black tracking-[0.25em] tnum text-emerald-600 dark:text-emerald-400">
                              {inviteCode}
                            </span>
                            <Button isIconOnly size="sm" variant="flat" color={codeCopied ? "success" : "default"} onPress={copyInvite} aria-label="Copiar código">
                              {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                            </Button>
                          </div>
                          <p className="text-[10px] text-default-400">
                            La otra persona lo ingresa en Ajustes → &quot;Unirme con código&quot; desde su propia cuenta.
                          </p>
                        </div>
                      ) : (
                        <Button
                          variant="flat" color="primary"
                          startContent={<UserPlus size={16} />}
                          isLoading={shareBusy}
                          onPress={generateInvite}
                          className="justify-start"
                        >
                          Invitar a alguien (generar código)
                        </Button>
                      )}

                      {members.length === 0 && (
                        <div className="flex gap-2">
                          <Input
                            size="sm" variant="bordered" placeholder="Código de invitación"
                            aria-label="Código de invitación"
                            value={joinCode}
                            onValueChange={(v) => setJoinCode(v.toUpperCase())}
                            maxLength={6}
                            classNames={{ input: "uppercase tracking-widest font-bold" }}
                            className="flex-1"
                          />
                          <Button
                            size="sm" variant="flat" color="secondary" className="font-bold"
                            isDisabled={joinCode.trim().length !== 6}
                            isLoading={shareBusy}
                            onPress={joinShared}
                          >
                            Unirme
                          </Button>
                        </div>
                      )}

                      {shareError && <p className="text-[11px] text-rose-500 font-semibold">{shareError}</p>}
                    </>
                  )}

                  {/* ── Categorías personalizadas ──────────────── */}
                  <p className="text-xs font-bold uppercase tracking-wider text-default-400 mt-2">Categorías personalizadas</p>
                  {([
                    { kind: "expense" as const, label: "Para gastos", list: customExpenseCats, setter: setCustomExpenseCats, value: newCatE, setValue: setNewCatE },
                    { kind: "income" as const, label: "Para ingresos", list: customIncomeCats, setter: setCustomIncomeCats, value: newCatI, setValue: setNewCatI },
                  ]).map(({ kind, label: catLabel, list, setter, value, setValue }) => (
                    <div key={kind} className="space-y-1.5">
                      <p className="text-[11px] font-semibold text-default-500">{catLabel}</p>
                      {list.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {list.map((c) => (
                            <span key={c} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              <Tag size={10} />
                              {c}
                              <button onClick={() => setter((prev) => prev.filter((x) => x !== c))} aria-label={`Quitar ${c}`} className="hover:text-rose-500 ml-0.5">
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input size="sm" variant="bordered" placeholder={kind === "expense" ? "Ej. Mascota, Gym" : "Ej. Propinas"}
                          value={value} onValueChange={setValue}
                          onKeyDown={(e) => { if (e.key === "Enter") addCustomCat(kind); }}
                          className="flex-1" aria-label={`Nueva categoría ${catLabel}`} />
                        <Button size="sm" variant="flat" color="primary" isIconOnly isDisabled={!value.trim()}
                          onPress={() => addCustomCat(kind)} aria-label="Agregar categoría">
                          <Plus size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}

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

                  <a href="/privacidad" target="_blank" rel="noopener"
                    className="text-[11px] text-default-400 hover:text-sky-500 underline underline-offset-2 mt-2">
                    Aviso de privacidad
                  </a>
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
