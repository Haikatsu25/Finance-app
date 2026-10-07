"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button, Divider, useDisclosure } from "@heroui/react";
import {
  Plus,
  Wallet,
  ShieldAlert,
  DollarSign,
  ArrowLeftRight,
} from "lucide-react";
import {
  FinanceItem,
  HistorySnapshot,
  SubscriptionItem,
  GoalItem,
  TransactionItem,
  CreditCardItem,
  BudgetItem,
  InstallmentPlan,
} from "@/types";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { money, round2, loadPrivacyMode, setPrivacyMode } from "@/lib/format";
import { biometricsAvailable, isLockEnabled, enableLock, disableLock, verifyLock } from "@/lib/applock";
import { cardDebtBreakdown, cycleKey, monthKey, shiftMonth, todayIso, isoDate } from "@/lib/finance-utils";
import { getPushStatus, enablePush, disablePush } from "@/lib/push-client";
import Analytics from "./Analytics";
import Transactions from "./Transactions";
import CreditCards from "./CreditCards";
import Budgets from "./Budgets";
import UpcomingPayments from "./UpcomingPayments";
import VoiceAssistant from "./VoiceAssistant";
import AIChat from "./AIChat";
import AIInsights from "./AIInsights";
import CashflowTimeline from "./CashflowTimeline";
import PlanView from "./PlanView";
import TicketScanner from "./TicketScanner";
import { startTour } from "./Tutorial";

import { useAnimatedCounter } from "./dashboard/useAnimatedCounter";
import { QUICK_CATEGORIES, type QuickAddType, type EditKind } from "./dashboard/quickAdd";
import { StatCard } from "./dashboard/StatCard";
import { DashboardSkeleton } from "./dashboard/DashboardSkeleton";
import { AppNav, NAV_ORDER, type NavTab } from "./dashboard/AppNav";
import { TabView, type TabDirection } from "./dashboard/TabView";
import { Section } from "./dashboard/Section";
import { SubscriptionsSection } from "./dashboard/SubscriptionsSection";
import { GoalsSection } from "./dashboard/GoalsSection";
import { type SaveStatus } from "./dashboard/SaveIndicator";
import { SignedOutLanding } from "./dashboard/SignedOutLanding";
import { BiometricLockScreen } from "./dashboard/BiometricLockScreen";
import { LoadErrorView } from "./dashboard/LoadErrorView";
import { TopNav } from "./dashboard/TopNav";
import { HomeViewToggle } from "./dashboard/HomeViewToggle";
import { UndoToast } from "./dashboard/UndoToast";
import { BalanceHero } from "./dashboard/BalanceHero";
import { AllocationStrip } from "./dashboard/AllocationStrip";
import { WelcomeCard } from "./dashboard/WelcomeCard";
import { DemoDataBanner } from "./dashboard/DemoDataBanner";
import { PendingFixedChargesCard } from "./dashboard/PendingFixedChargesCard";
import { HistoryTab } from "./dashboard/HistoryTab";
import { QuickAddModal } from "./dashboard/QuickAddModal";
import { TransferModal } from "./dashboard/TransferModal";
import { EditModal } from "./dashboard/EditModal";
import { SnapshotModal } from "./dashboard/SnapshotModal";
import { SettingsModal } from "./dashboard/SettingsModal";
import { ClearHistoryModal } from "./dashboard/ClearHistoryModal";
import { ImportModal } from "./dashboard/ImportModal";
import { SyncConflictModal } from "./dashboard/SyncConflictModal";

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

  const { user, isLoaded, isSignedIn } = useUser();
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
    /** Texto completo del toast; si falta, dice "Se eliminó {label}" */
    message?: string;
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
  }, []);

  // Carga de datos. Espera a que Clerk termine de cargar: antes se pedía /api/finance
  // al montar, cuando Clerk aún no sabía quién eres, y el servidor respondía 401
  // (dos por carga). La ref evita repetir la petición con el doble montaje de
  // StrictMode o con re-renders de la misma sesión.
  const userId = user?.id;
  const fetchedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!isLoaded) return;
    // Sin sesión se muestra la pantalla de entrada: no hay nada que pedir. isLoading se
    // queda en true a propósito: el guardado automático exige !isLoading, y sin sesión
    // dispararía un POST /api/finance (otro 401).
    if (!isSignedIn || !userId) return;
    if (fetchedFor.current === userId) return;
    fetchedFor.current = userId;

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
  }, [isLoaded, isSignedIn, userId, applyServerData]);

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

  // ── Deshacer borrados ────────────────────────────────────────
  const scheduleUndo = (label: string, restore: () => void, message?: string) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setPendingUndo({ label, restore, message });
    undoTimerRef.current = setTimeout(() => setPendingUndo(null), 5000);
  };

  const handleUndo = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    pendingUndo?.restore();
    setPendingUndo(null);
  };

  // ── Handlers ─────────────────────────────────────────────────
  /**
   * Botón "Pagado": la deuda de contado queda en $0, los gastos vinculados
   * a esa tarjeta salen de la lista (ya se pagaron) y el estado de cuenta en
   * curso se anota como pagado (lastPaidCycle) para que no se marque vencido
   * ni se te avise de él. Todo reversible con Deshacer.
   */
  const markCardPaid = (cardId: string) => {
    const card = creditCards.find((c) => c.id === cardId);
    if (!card) return;
    const prevBalance = card.balance || 0;
    const prevPaidCycle = card.lastPaidCycle;
    const paidCycle = cycleKey(card);
    const linked = liabilities.filter((l) => l.cardId === cardId);

    setCreditCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, balance: 0, lastPaidCycle: paidCycle } : c)));
    if (linked.length) setLiabilities((prev) => prev.filter((l) => l.cardId !== cardId));

    const [py, pm, pd] = paidCycle.split("-").map(Number);
    const cycleLabel = new Date(py, pm - 1, pd).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

    scheduleUndo(`Pago de ${card.label}`, () => {
      setCreditCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, balance: prevBalance, lastPaidCycle: prevPaidCycle } : c)));
      if (linked.length) setLiabilities((prev) => [...prev, ...linked]);
    }, `Marcaste pagado el ciclo del ${cycleLabel} (${card.label})`);
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
      date: date || todayIso(),
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
    }, `Transferiste ${money(amount)} de ${from.label} a ${to.label}`);
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
    const iso = isoDate; // hora local, no UTC
    const daysAgo = (n: number) => { const d = new Date(today); d.setDate(d.getDate() - n); return d; };
    const monthsFromNow = (n: number) => { const d = new Date(today); d.setMonth(d.getMonth() + n); return d; };
    const uid = () => crypto.randomUUID();
    // La tarjeta de ejemplo siempre está "a la mitad de su ciclo": cortó hace 6 días y paga dentro de 14.
    // Con días fijos (corte 18 / pago 28) aparecía como pago vencido del día 1 al 18 de cada mes.
    const dayOfMonth = (d: Date) => Math.min(d.getDate(), 28);
    const cutoffDay = dayOfMonth(daysAgo(6));
    const dueDay = dayOfMonth(daysAgo(-14));

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
      { id: cardId, label: "Nu (ejemplo)", balance: 2350, creditLimit: 20000, cutoffDay, dueDay, apr: 65, minPayment: 0 },
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
    const today = todayIso();
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
    a.download = `finance-backup-${todayIso()}.json`;
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
  // La vista nueva entra desde el lado que corresponde al orden de las pestañas
  const [tabDir, setTabDir] = useState<TabDirection>("up");
  const changeTab = (tab: NavTab) => {
    setTabDir(tab === activeTab ? "up" : NAV_ORDER.indexOf(tab) > NAV_ORDER.indexOf(activeTab) ? "l" : "r");
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

  if (!mounted) return <DashboardSkeleton />;

  return (
    <div className="app-shell text-foreground font-sans">
      <AppNav active={activeTab} onChange={changeTab} />

      <div className="app-col">
      {/* ── ENCABEZADO: saludo y atajos ──────────────────────── */}
      <TopNav
        saveStatus={saveStatus}
        privacy={privacy}
        onTogglePrivacy={togglePrivacy}
        onVoiceOpen={onVoiceOpen}
        onStartTour={handleStartTour}
        onOpenSettings={onDataModalOpen}
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
        <main>

          {/* ── INICIO ────────────────────────────────────────── */}
          <TabView active={activeTab === "dashboard"} direction={tabDir}>
            {/* Bienvenida / datos de ejemplo */}
            {!planMode && isEmpty && !demoDismissed && (
              <WelcomeCard onLoadDemo={loadDemoData} onDismiss={() => setDemoDismissed(true)} />
            )}

            {appSettings.demoData && (
              <DemoDataBanner onClear={clearDemoData} />
            )}

            <HomeViewToggle planMode={planMode} setPlanMode={setPlanMode} planMonthKey={planMonthKey} />

            {planMode ? (
              <div className="wide">
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
              </div>
            ) : (
              <>
                <BalanceHero
                  isPositive={isPositive}
                  animatedAvailable={animatedAvailable}
                  transactions={transactions}
                  currentMonthKey={currentMonthKey}
                  totalAssets={totalAssets}
                  totalLiabilities={totalLiabilities}
                  totalFixedCosts={totalFixedCosts}
                  totalMsiMonthly={totalMsiMonthly}
                  onSaveSnapshot={saveSnapshot}
                  onViewHistory={() => changeTab("history")}
                />

                <div className="tiles">
                  <StatCard label="Total activos" value={totalAssets}      tone="emerald" />
                  <StatCard label="Deudas"        value={totalLiabilities} tone="rose" />
                  <StatCard label="Apartados"     value={totalBuckets}     tone="amber" />
                </div>

                <AllocationStrip
                  totalAssets={totalAssets}
                  totalLiabilities={totalLiabilities}
                  totalBuckets={totalBuckets}
                  totalFixedCosts={totalFixedCosts}
                  totalMsiMonthly={totalMsiMonthly}
                  remaining={afterThisMonth}
                />

                {/* Por pagar (siempre visible en Inicio) */}
                <UpcomingPayments cards={creditCards} subscriptions={subscriptions} installments={installments} />

                {/* Gastos fijos del mes pendientes */}
                {pendingFixed.length > 0 && !fixedDismissed && (
                  <PendingFixedChargesCard
                    pendingFixed={pendingFixed}
                    pendingFixedTotal={pendingFixedTotal}
                    currentMonthKey={currentMonthKey}
                    onDismiss={dismissFixedCharges}
                    onRegister={registerFixedCharges}
                  />
                )}

                {/* Mis finanzas */}
                <div className="wide flex items-center justify-between gap-2 mt-1 px-0.5" id="management-sections">
                  <h2 className="text-xl font-extrabold section-title">Mis finanzas</h2>
                  {assets.length >= 2 && (
                    <Button size="sm" variant="flat" color="secondary" radius="full"
                      className="font-bold min-h-11 bg-brand-soft text-brand-text"
                      startContent={<ArrowLeftRight size={14} />} onPress={onTransferOpen}>
                      Transferir
                    </Button>
                  )}
                </div>
                <Section
                  title="Ingresos y activos"
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
                  title="Gastos y deudas"
                  description="Préstamos, pendientes"
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
                  title="Apartados y ahorro"
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
                <div className="wide">
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
                </div>
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
              </>
            )}
          </TabView>

          {/* ── MOVIMIENTOS ───────────────────────────────────── */}
          <TabView active={activeTab === "transactions"} direction={tabDir}>
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
          </TabView>

          {/* ── ANÁLISIS ──────────────────────────────────────── */}
          <TabView active={activeTab === "analytics"} direction={tabDir}>
            <CashflowTimeline
              cards={creditCards}
              subscriptions={subscriptions}
              installments={installments}
              startBalance={available}
              transactions={transactions}
            />
            <Analytics history={history} assets={assets} transactions={transactions} />
          </TabView>

          {/* ── FINANCE AI ────────────────────────────────────── */}
          <TabView active={activeTab === "ai"} direction={tabDir}>
            <AIInsights
              data={{ assets, liabilities, buckets, subscriptions, goals, transactions, creditCards, installments, budgets }}
              onAskAI={(p) => setAiPrompt(p)}
            />
            <AIChat queuedPrompt={aiPrompt} onPromptConsumed={() => setAiPrompt(null)} />
          </TabView>

          {/* ── HISTORIAL ─────────────────────────────────────── */}
          <TabView active={activeTab === "history"} direction={tabDir}>
            <HistoryTab history={history} onClearOpen={onClearOpen} onOpenDetails={openHistoryDetails} />
          </TabView>
        </main>
        )}

        {/* ── FAB → registro rápido ───────────────────────────── */}
        {!isLoading && !loadError && (
          <button
            className="fab"
            onClick={onQuickAddOpen}
            aria-label="Agregar registro rápido"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        )}

        {/* ── TOAST DESHACER ──────────────────────────────────── */}
        {pendingUndo && (
          <UndoToast label={pendingUndo.label} message={pendingUndo.message} onUndo={handleUndo} />
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
        <SnapshotModal isOpen={isOpen} onOpenChange={onOpenChange} selectedSnapshot={selectedSnapshot} />

        {/* ── MODAL: ajustes de datos ─────────────────────────── */}
        <SettingsModal
          isOpen={isDataModalOpen}
          onOpenChange={onDataModalChange}
          onClearOpen={onClearOpen}
          onVoiceOpen={onVoiceOpen}
          onStartTour={handleStartTour}
          lockOn={lockOn}
          bioAvailable={bioAvailable}
          toggleBiometricLock={toggleBiometricLock}
          pushStatus={pushStatus}
          pushBusy={pushBusy}
          togglePush={togglePush}
          isSharedMember={isSharedMember}
          shareBusy={shareBusy}
          leaveShared={leaveShared}
          leaveArmed={leaveArmed}
          members={members}
          removeMember={removeMember}
          inviteCode={inviteCode}
          codeCopied={codeCopied}
          copyInvite={copyInvite}
          generateInvite={generateInvite}
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          joinShared={joinShared}
          shareError={shareError}
          customExpenseCats={customExpenseCats}
          setCustomExpenseCats={setCustomExpenseCats}
          customIncomeCats={customIncomeCats}
          setCustomIncomeCats={setCustomIncomeCats}
          newCatE={newCatE}
          setNewCatE={setNewCatE}
          newCatI={newCatI}
          setNewCatI={setNewCatI}
          addCustomCat={addCustomCat}
          exportData={exportData}
          onImportFile={onImportFile}
        />

        {/* ── MODAL: confirmar limpiar historial ──────────────── */}
        <ClearHistoryModal isOpen={isClearOpen} onOpenChange={onClearChange} historyCount={history.length} onConfirm={confirmClearHistory} />

        {/* ── MODAL: confirmar importación ────────────────────── */}
        <ImportModal isOpen={isImportOpen} onOpenChange={onImportChange} importError={importError} importPreview={importPreview} onConfirm={confirmImport} />

        {/* ── MODAL: conflicto de sincronización ──────────────── */}
        <SyncConflictModal isOpen={conflictData !== null} onResolve={resolveConflict} />
      </SignedIn>
      </div>
    </div>
  );
}
