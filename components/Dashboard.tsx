"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Progress,
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
  Calendar as CalendarIcon,
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
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { FinanceItem, HistorySnapshot, SubscriptionItem, GoalItem } from "@/types";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import Analytics from "./Analytics";
import FinanceAI from "./FinanceAI";
import { startTour } from "./Tutorial";

// ─────────────────────────────────────────────────────────────────────────────
// ANIMATED COUNTER HOOK
// ─────────────────────────────────────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const from = value;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Easing: easeOutExpo
      const eased = 1 - Math.pow(2, -10 * progress);
      setValue(from + (target - from) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon, colorClass, bgClass, delay = 0
}: {
  label: string; value: number; icon: React.ReactNode;
  colorClass: string; bgClass: string; delay?: number;
}) {
  const animated = useAnimatedCounter(value);
  return (
    <Card
      className={`glass card-hover border-0 animate-fade-in-scale`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardBody className="flex flex-row justify-between items-center p-5">
        <div>
          <p className="text-default-400 text-xs font-bold uppercase tracking-wide mb-1">{label}</p>
          <p className={`text-2xl font-extrabold font-mono ${colorClass}`}>
            ${Math.abs(animated).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className={`p-3 ${bgClass} rounded-2xl`}>
          <div className={colorClass}>{icon}</div>
        </div>
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE BOTTOM NAV
// ─────────────────────────────────────────────────────────────────────────────
type NavTab = "dashboard" | "analytics" | "ai" | "history";

function BottomNav({ active, onChange }: { active: NavTab; onChange: (t: NavTab) => void }) {
  const tabs: { id: NavTab; icon: React.ReactNode; label: string }[] = [
    { id: "dashboard", icon: <LayoutDashboard size={20} />, label: "Inicio" },
    { id: "analytics", icon: <BarChart2 size={20} />,      label: "Análisis" },
    { id: "ai",        icon: <Brain size={20} />,           label: "IA" },
    { id: "history",   icon: <History size={20} />,         label: "Historial" },
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
              className={`flex flex-col items-center gap-1 px-4 py-1 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-emerald-500 scale-105"
                  : "text-default-400 hover:text-default-600"
              }`}
              aria-label={t.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className={`transition-transform duration-200 ${isActive ? "scale-110" : ""}`}>
                {t.icon}
              </div>
              <span className="text-[10px] font-semibold">{t.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 rounded-full bg-emerald-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION COMPONENT — Financial input section
// ─────────────────────────────────────────────────────────────────────────────
function Section({ title, description, icon, items, total, color, categories, onAdd, onRemove }: any) {
  const [label, setLabel]       = useState("");
  const [amount, setAmount]     = useState("");
  const [date, setDate]         = useState("");
  const [category, setCategory] = useState(categories[0]);

  const handleAdd = () => {
    if (!label || !amount) return;
    onAdd(label, amount, date, category);
    setLabel("");
    setAmount("");
    setDate("");
    setCategory(categories[0]);
  };

  const colorMap: Record<string, { text: string; bg: string; border: string; badge: string }> = {
    success: {
      text:   "text-emerald-500",
      bg:     "bg-emerald-500/10",
      border: "border-emerald-500/20",
      badge:  "bg-emerald-500/15",
    },
    danger: {
      text:   "text-rose-500",
      bg:     "bg-rose-500/10",
      border: "border-rose-500/20",
      badge:  "bg-rose-500/15",
    },
    warning: {
      text:   "text-amber-500",
      bg:     "bg-amber-500/10",
      border: "border-amber-500/20",
      badge:  "bg-amber-500/15",
    },
  };
  const c = colorMap[color] ?? colorMap.success;

  return (
    <Card className={`glass card-hover border ${c.border} h-full`}>
      <CardHeader className="flex flex-col items-start px-5 pt-5 pb-0 gap-1">
        <div className={`p-2.5 rounded-xl ${c.bg} mb-2`}>
          <div className={c.text}>{icon}</div>
        </div>
        <div className="flex justify-between w-full items-start">
          <div>
            <h3 className="text-base font-bold">{title}</h3>
            <p className="text-xs text-default-400">{description}</p>
          </div>
          <span className={`text-lg font-mono font-extrabold ${c.text}`}>
            ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </CardHeader>

      <CardBody className="px-5 py-4 flex flex-col gap-3">
        {/* Items list */}
        <div className="flex-grow space-y-2 min-h-[80px]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-6 border-2 border-dashed border-default-100 rounded-xl text-default-300">
              <p className="text-xs">Sin registros</p>
            </div>
          ) : (
            items.map((item: FinanceItem) => (
              <div
                key={item.id}
                className={`group flex justify-between items-center p-3 rounded-xl ${c.badge} hover:opacity-90 transition-all duration-200 border border-transparent hover:border-default-200 animate-slide-in-left`}
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-default-700 truncate">{item.label}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.category && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} font-medium`}>
                        {item.category}
                      </span>
                    )}
                    {item.date && (
                      <span className="text-[10px] text-default-400">{item.date}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`font-mono font-bold text-sm ${c.text}`}>
                    ${item.amount.toLocaleString()}
                  </span>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-default-300 hover:text-rose-500 transition-all p-1 rounded-lg hover:bg-rose-500/10"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Divider className="my-1" />

        {/* Input Form */}
        <div className="space-y-2.5">
          <Input
            placeholder="Descripción"
            size="sm"
            variant="bordered"
            classNames={{ inputWrapper: "bg-default-50 hover:bg-default-100 border-default-200" }}
            value={label}
            onValueChange={setLabel}
          />
          <Select
            placeholder="Categoría"
            size="sm"
            variant="bordered"
            classNames={{ trigger: "bg-default-50 hover:bg-default-100 border-default-200" }}
            selectedKeys={[category]}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((cat: string) => (
              <SelectItem key={cat}>{cat}</SelectItem>
            ))}
          </Select>
          <div className="flex gap-2">
            <Input
              type="number"
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
              classNames={{ inputWrapper: "bg-default-50 hover:bg-default-100 border-default-200" }}
              className="w-[130px]"
              value={date}
              onValueChange={setDate}
            />
          </div>
          <Button
            fullWidth
            color={color as any}
            variant="shadow"
            onPress={handleAdd}
            className="font-bold text-sm"
            size="sm"
            isDisabled={!label || !amount}
            startContent={<Plus size={15} />}
          >
            Agregar
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBSCRIPTIONS SECTION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function SubscriptionsSection({ items, total, onAdd, onRemove }: any) {
  const [label, setLabel]       = useState("");
  const [amount, setAmount]     = useState("");
  const [billingCycle, setBillingCycle] = useState<"mensual" | "anual">("mensual");
  const [category, setCategory] = useState("Suscripción");

  const categories = ["Suscripción", "Servicios", "Renta", "Gimnasio", "Seguro", "Otro"];

  const handleAdd = () => {
    if (!label || !amount) return;
    onAdd(label, amount, billingCycle, category);
    setLabel("");
    setAmount("");
  };

  return (
    <Card className="glass card-hover border border-indigo-500/20 h-full">
      <CardHeader className="flex flex-col items-start px-5 pt-5 pb-0 gap-1">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 mb-2">
          <div className="text-indigo-500"><Calendar size={18} /></div>
        </div>
        <div className="flex justify-between w-full items-start">
          <div>
            <h3 className="text-base font-bold">Gastos Fijos</h3>
            <p className="text-xs text-default-400">Suscripciones y cobros recurrentes</p>
          </div>
          <div className="text-right">
            <span className="text-lg font-mono font-extrabold text-indigo-500">
              ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
            <p className="text-[10px] text-default-400">/ mes (eqv.)</p>
          </div>
        </div>
      </CardHeader>

      <CardBody className="px-5 py-4 flex flex-col gap-3">
        <div className="flex-grow space-y-2 min-h-[80px]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-6 border-2 border-dashed border-default-100 rounded-xl text-default-300">
              <p className="text-xs">Sin gastos fijos</p>
            </div>
          ) : (
            items.map((item: SubscriptionItem) => (
              <div
                key={item.id}
                className="group flex justify-between items-center p-3 rounded-xl bg-indigo-500/15 hover:opacity-90 transition-all duration-200 border border-transparent hover:border-default-200 animate-slide-in-left"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-default-700 truncate">{item.label}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-medium">
                        {item.category}
                      </span>
                    )}
                    <span className="text-[10px] text-default-400 font-bold uppercase">{item.billingCycle}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="font-mono font-bold text-sm text-indigo-500">
                    ${item.amount.toLocaleString()}
                  </span>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-default-300 hover:text-rose-500 transition-all p-1 rounded-lg hover:bg-rose-500/10"
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
              className="w-[120px]"
              selectedKeys={[billingCycle]}
              onSelectionChange={(keys) => setBillingCycle(Array.from(keys)[0] as "mensual"|"anual")}
            >
              <SelectItem key="mensual">Mensual</SelectItem>
              <SelectItem key="anual">Anual</SelectItem>
            </Select>
          </div>
          <Button
            fullWidth
            color="primary"
            variant="shadow"
            onPress={handleAdd}
            className="font-bold text-sm bg-indigo-500"
            size="sm"
            isDisabled={!label || !amount}
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
// GOALS SECTION COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
function GoalsSection({ items, onAdd, onRemove, onUpdateProgress }: any) {
  const [label, setLabel] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  const handleAdd = () => {
    if (!label || !targetAmount || !deadline) return;
    onAdd(label, targetAmount, deadline);
    setLabel("");
    setTargetAmount("");
    setDeadline("");
  };

  return (
    <Card className="glass card-hover border border-purple-500/20 col-span-1 sm:col-span-2 lg:col-span-3">
      <CardHeader className="flex flex-col items-start px-5 pt-5 pb-0 gap-1">
        <div className="p-2.5 rounded-xl bg-purple-500/10 mb-2">
          <div className="text-purple-500"><Target size={18} /></div>
        </div>
        <div>
          <h3 className="text-base font-bold">Metas de Ahorro</h3>
          <p className="text-xs text-default-400">Rastrea tu progreso hacia objetivos específicos</p>
        </div>
      </CardHeader>

      <CardBody className="px-5 py-4 flex flex-col gap-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-default-100 rounded-xl text-default-300">
            <p className="text-xs">Sin metas activas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item: GoalItem) => {
              const progress = Math.min(100, (item.currentAmount / item.targetAmount) * 100) || 0;
              return (
                <div key={item.id} className="relative group p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 animate-fade-in-up hover:bg-purple-500/10 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-bold text-default-800">{item.label}</span>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-default-300 hover:text-rose-500 transition-all p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="flex justify-between text-xs text-default-500 font-mono mb-1">
                    <span className="text-emerald-500 font-bold">${item.currentAmount.toLocaleString()}</span>
                    <span>${item.targetAmount.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-default-200/50 mb-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-[10px] text-default-400">Meta: {item.deadline}</span>
                    <div className="flex items-center gap-1">
                      <Input 
                        size="sm" 
                        variant="faded" 
                        placeholder="Abonar $" 
                        className="w-20"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value;
                            if (val) onUpdateProgress(item.id, (item.currentAmount + parseFloat(val)).toString());
                            (e.target as HTMLInputElement).value = "";
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-default-200/50 mt-2">
          <Input placeholder="Ej. Viaje, Auto" size="sm" variant="bordered" value={label} onValueChange={setLabel} className="flex-1" />
          <Input type="number" placeholder="Monto Meta ($)" size="sm" variant="bordered" value={targetAmount} onValueChange={setTargetAmount} className="w-full sm:w-32" />
          <Input type="date" size="sm" variant="bordered" value={deadline} onValueChange={setDeadline} className="w-full sm:w-32" />
          <Button color="secondary" variant="shadow" onPress={handleAdd} isDisabled={!label || !targetAmount || !deadline} className="font-bold bg-purple-500">
            Crear Meta
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [assets,      setAssets]      = useState<FinanceItem[]>([]);
  const [liabilities, setLiabilities] = useState<FinanceItem[]>([]);
  const [buckets,     setBuckets]     = useState<FinanceItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [goals,       setGoals]       = useState<GoalItem[]>([]);
  const [history,     setHistory]     = useState<HistorySnapshot[]>([]);
  const [mounted,     setMounted]     = useState(false);
  const [isLoading,   setIsLoading]   = useState(true);
  const [activeTab,   setActiveTab]   = useState<NavTab>("dashboard");
  const [fabOpen,     setFabOpen]     = useState(false);

  const { theme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // ── Load from API ──────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      try {
        const res = await fetch("/api/finance");
        if (res.ok) {
          const data = await res.json();
          setAssets(data.assets || []);
          setLiabilities(data.liabilities || []);
          setBuckets(data.buckets || []);
          setSubscriptions(data.subscriptions || []);
          setGoals(data.goals || []);
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Auto-save ─────────────────────────────────────────────────
  const saveData = async (a: any, l: any, b: any, h: any, sub: any, g: any) => {
    try {
      await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: a, liabilities: l, buckets: b, history: h, subscriptions: sub, goals: g }),
      });
    } catch (error) {
      console.error("Failed to save data:", error);
    }
  };

  useEffect(() => {
    if (!mounted || isLoading) return;
    const timer = setTimeout(() => saveData(assets, liabilities, buckets, history, subscriptions, goals), 1000);
    return () => clearTimeout(timer);
  }, [assets, liabilities, buckets, history, subscriptions, goals, mounted, isLoading]);

  // ── Computed values ───────────────────────────────────────────
  const totalAssets      = assets.reduce((s, i) => s + i.amount, 0);
  const totalLiabilities = liabilities.reduce((s, i) => s + i.amount, 0);
  const totalBuckets     = buckets.reduce((s, i) => s + i.amount, 0);
  const totalFixedCosts  = subscriptions.reduce((s, i) => {
    // Convert yearly to monthly equivalent for the fixed cost metric
    return s + (i.billingCycle === "anual" ? i.amount / 12 : i.amount);
  }, 0);
  const available        = totalAssets - totalLiabilities - totalBuckets;

  // ── Animated counter — must be before any early return (Rules of Hooks) ──
  const animatedAvailable = useAnimatedCounter(available);
  const isPositive        = available >= 0;
  const balanceProgress   = totalAssets > 0
    ? Math.max(0, Math.min(100, (available / totalAssets) * 100))
    : 0;

  // ── Handlers ──────────────────────────────────────────────────
  const handleAddItem = (type: "asset" | "liability" | "bucket", label: string, amount: string, date: string, category: string) => {
    const item: FinanceItem = {
      id:       crypto.randomUUID(),
      label,
      amount:   parseFloat(amount),
      date:     date || new Date().toISOString().split("T")[0],
      type,
      category,
    };
    if (type === "asset")     setAssets([...assets, item]);
    if (type === "liability") setLiabilities([...liabilities, item]);
    if (type === "bucket")    setBuckets([...buckets, item]);
  };

  const removeItem = (id: string, type: "asset" | "liability" | "bucket") => {
    if (type === "asset")     setAssets(assets.filter((i) => i.id !== id));
    if (type === "liability") setLiabilities(liabilities.filter((i) => i.id !== id));
    if (type === "bucket")    setBuckets(buckets.filter((i) => i.id !== id));
  };

  const handleAddSubscription = (label: string, amount: string, billingCycle: "mensual" | "anual", category: string) => {
    const item: SubscriptionItem = {
      id: crypto.randomUUID(),
      label,
      amount: parseFloat(amount),
      billingCycle,
      category,
    };
    setSubscriptions([...subscriptions, item]);
  };

  const removeSubscription = (id: string) => {
    setSubscriptions(subscriptions.filter((i) => i.id !== id));
  };

  const handleAddGoal = (label: string, targetAmount: string, deadline: string) => {
    const item: GoalItem = {
      id: crypto.randomUUID(),
      label,
      targetAmount: parseFloat(targetAmount),
      currentAmount: 0,
      deadline,
    };
    setGoals([...goals, item]);
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter((i) => i.id !== id));
  };

  const updateGoalProgress = (id: string, currentAmount: string) => {
    setGoals(goals.map(g => g.id === id ? { ...g, currentAmount: parseFloat(currentAmount) } : g));
  };

  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isDataModalOpen, onOpen: onDataModalOpen, onOpenChange: onDataModalChange } = useDisclosure();
  const [selectedSnapshot, setSelectedSnapshot] = useState<HistorySnapshot | null>(null);

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

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        if (confirm("Esto reemplazará todos tus datos actuales. ¿Continuar?")) {
          setAssets(data.assets || []);
          setLiabilities(data.liabilities || []);
          setBuckets(data.buckets || []);
          setSubscriptions(data.subscriptions || []);
          setGoals(data.goals || []);
          setHistory(data.history || []);
          // Save immediately to DB
          await saveData(
            data.assets || [],
            data.liabilities || [],
            data.buckets || [],
            data.history || [],
            data.subscriptions || [],
            data.goals || []
          );
        }
      } catch (err) {
        alert("Archivo inválido o corrupto.");
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // reset input
  };

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
      assets:      [...assets],
      liabilities: [...liabilities],
      buckets:     [...buckets],
      subscriptions: [...subscriptions],
      goals:       [...goals],
    };
    setHistory([snapshot, ...history]);
  };

  const clearHistory = () => {
    if (confirm("¿Deseas limpiar todo el historial?")) setHistory([]);
  };

  const openHistoryDetails = (snapshot: HistorySnapshot) => {
    setSelectedSnapshot(snapshot);
    onOpen();
  };

  const handleStartTour = () => startTour(isDark);

  // ── Tab change — Inicio sube al top, los demás bajan al contenido
  const changeTab = (tab: NavTab) => {
    setActiveTab(tab);
    setTimeout(() => {
      if (tab === "dashboard") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        document.getElementById("tab-content")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 50);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen text-foreground font-sans selection:bg-emerald-100 selection:text-emerald-900">

      {/* ── TOP NAV ──────────────────────────────────────────── */}
      <nav className="glass-nav w-full sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          {/* Logo */}
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

          {/* Desktop Nav tabs */}
          <div className="hidden md:flex items-center gap-1 bg-default-100/70 rounded-xl p-1">
            {([
              { id: "dashboard", icon: <LayoutDashboard size={15} />, label: "Inicio" },
              { id: "analytics", icon: <BarChart2 size={15} />,       label: "Análisis" },
              { id: "ai",        icon: <Brain size={15} />,            label: "FinanceAI" },
              { id: "history",   icon: <History size={15} />,          label: "Historial" },
            ] as { id: NavTab; icon: React.ReactNode; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => changeTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-white dark:bg-default-800 text-emerald-600 shadow-sm"
                    : "text-default-500 hover:text-default-700"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
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
            <h1 className="text-4xl sm:text-6xl font-black mb-4 gradient-text-emerald">
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

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 justify-center mt-12 animate-fade-in-up delay-300">
            {["📊 Analíticas avanzadas", "🧠 Red Neuronal IA", "📱 Móvil amigable", "🔒 Datos seguros"].map((f) => (
              <span key={f} className="glass px-4 py-2 rounded-full text-xs font-medium text-default-600">{f}</span>
            ))}
          </div>
        </div>
      </SignedOut>

      {/* ── SIGNED IN ─────────────────────────────────────────── */}
      <SignedIn>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">

          {/* ── HERO SECTION ────────────────────────────────── */}
          {/* Hero siempre visible — muestra el balance sin importar el tab */}
          <section className="animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

              {/* Main Balance Card */}
              <Card
                id="balance-card"
                className={`col-span-1 md:col-span-8 border-0 overflow-hidden relative ${
                  isPositive
                    ? "glow-emerald"
                    : "glow-rose"
                }`}
              >
                {/* Gradient background */}
                <div className={`absolute inset-0 ${
                  isPositive
                    ? "bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600"
                    : "bg-gradient-to-br from-rose-500 via-red-500 to-orange-600"
                }`} />
                {/* Decorative circles */}
                <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

                <CardBody className="relative z-10 py-8 px-7">
                  <div className="flex items-center gap-2 mb-2">
                    <PiggyBank size={16} className="text-white/70" />
                    <p className="text-white/70 font-semibold text-xs tracking-widest uppercase">
                      {isPositive ? "Balance Disponible" : "Déficit Acumulado"}
                    </p>
                  </div>
                  <h2 className="text-5xl sm:text-6xl font-black text-white tracking-tight mb-1">
                    {!isPositive && "-"}${Math.abs(animatedAvailable).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </h2>
                  <p className="text-white/60 text-sm mb-5">
                    Actualizado ahora
                  </p>

                  {/* Progress bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-xs text-white/60 mb-1.5">
                      <span>Balance vs Activos totales</span>
                      <span>{balanceProgress.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/20">
                      <div
                        className="h-full rounded-full bg-white/70 transition-all duration-1000"
                        style={{ width: `${balanceProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      id="save-snapshot-btn"
                      className="bg-white/20 text-white border border-white/30 font-bold hover:bg-white/30 backdrop-blur-md"
                      variant="bordered"
                      startContent={<Save size={16} />}
                      onPress={saveSnapshot}
                      size="sm"
                    >
                      Guardar Snapshot
                    </Button>
                    <Button
                      variant="light"
                      className="text-white/70 hover:text-white hover:bg-white/10"
                      size="sm"
                      startContent={<History size={16} />}
                      onPress={() => changeTab("history")}
                    >
                      Ver historial
                    </Button>
                    <Button
                      variant="light"
                      className="text-white/70 hover:text-white hover:bg-white/10"
                      size="sm"
                      startContent={<Database size={16} />}
                      onPress={onDataModalOpen}
                    >
                      Ajustes
                    </Button>
                  </div>
                </CardBody>
              </Card>

              {/* Stat Cards */}
              <div className="col-span-1 md:col-span-4 flex flex-col gap-3">
                <StatCard
                  label="Total Activos"
                  value={totalAssets}
                  icon={<TrendingUp size={20} />}
                  colorClass="text-emerald-500"
                  bgClass="bg-emerald-500/15"
                  delay={100}
                />
                <StatCard
                  label="Gastos / Deudas"
                  value={totalLiabilities}
                  icon={<TrendingDown size={20} />}
                  colorClass="text-rose-500"
                  bgClass="bg-rose-500/15"
                  delay={200}
                />
                <StatCard
                  label="Apartados"
                  value={totalBuckets}
                  icon={<Wallet size={20} />}
                  colorClass="text-amber-500"
                  bgClass="bg-amber-500/15"
                  delay={300}
                />
              </div>
            </div>
          </section>

          {/* Anchor: scroll target so tab content is the first thing visible */}
          <div id="tab-content" style={{ scrollMarginTop: "72px" }} />

          {/* ── MANAGEMENT SECTIONS ── */}
          <section
            className={activeTab !== "dashboard" ? "hidden" : ""}
            id="management-sections"
          >
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
                categories={["Efectivo", "Banco", "Inversión", "Propiedad", "Otros"]}
                onAdd={(l: string, a: string, d: string, c: string) => handleAddItem("asset", l, a, d, c)}
                onRemove={(id: string) => removeItem(id, "asset")}
              />
              <Section
                title="Gastos & Deudas"
                description="Tarjetas, préstamos, pendientes"
                icon={<ShieldAlert size={18} />}
                items={liabilities}
                total={totalLiabilities}
                color="danger"
                categories={["Tarjeta de Crédito", "Préstamo", "Servicios", "Hogar", "Comida", "Transporte", "Otros"]}
                onAdd={(l: string, a: string, d: string, c: string) => handleAddItem("liability", l, a, d, c)}
                onRemove={(id: string) => removeItem(id, "liability")}
              />
              <Section
                title="Apartados & Ahorro"
                description="Fondos reservados, sobres"
                icon={<Wallet size={18} />}
                items={buckets}
                total={totalBuckets}
                color="warning"
                categories={["Emergencia", "Viaje", "Auto", "Regalos", "Ahorro", "Otros"]}
                onAdd={(l: string, a: string, d: string, c: string) => handleAddItem("bucket", l, a, d, c)}
                onRemove={(id: string) => removeItem(id, "bucket")}
              />
              <SubscriptionsSection
                items={subscriptions}
                total={totalFixedCosts}
                onAdd={handleAddSubscription}
                onRemove={removeSubscription}
              />
              <GoalsSection
                items={goals}
                onAdd={handleAddGoal}
                onRemove={removeGoal}
                onUpdateProgress={updateGoalProgress}
              />
            </div>
          </section>

          {/* ── ANALYTICS TAB ─────────────────────────────────── */}
          <section className={activeTab !== "analytics" ? "hidden" : ""}>
            <Divider className="my-2" />
            <Analytics
              history={history}
              assets={assets}
              liabilities={liabilities}
              isDark={isDark}
            />
          </section>

          {/* ── FINANCE AI TAB ────────────────────────────────── */}
          <section className={activeTab !== "ai" ? "hidden" : ""}>
            <Divider className="my-2" />
            <FinanceAI
              history={history}
              assets={assets}
              liabilities={liabilities}
              isDark={isDark}
            />
          </section>

          {/* ── HISTORY TAB ───────────────────────────────────── */}
          <section
            id="history-section"
            className={activeTab !== "history" ? "hidden" : ""}
          >
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
                  onPress={clearHistory}
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
                  color="primary"
                  selectionMode="none"
                >
                  <TableHeader>
                    <TableColumn className="text-xs font-bold uppercase tracking-wide">Fecha</TableColumn>
                    <TableColumn className="text-xs font-bold uppercase tracking-wide">Activos</TableColumn>
                    <TableColumn className="text-xs font-bold uppercase tracking-wide">Gastos</TableColumn>
                    <TableColumn className="text-xs font-bold uppercase tracking-wide">Apartados</TableColumn>
                    <TableColumn className="text-xs font-bold uppercase tracking-wide">Disponible</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent={
                    <div className="py-12 text-center text-default-300">
                      <History size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Aún no hay historial guardado</p>
                      <p className="text-xs mt-1">Presiona "Guardar Snapshot" para registrar tu balance actual</p>
                    </div>
                  }>
                    {history.map((h) => (
                      <TableRow
                        key={h.id}
                        className="cursor-pointer hover:bg-default-50 transition-colors border-b border-divider last:border-none"
                        onClick={() => openHistoryDetails(h)}
                      >
                        <TableCell className="font-medium text-xs py-3">
                          {new Date(h.date).toLocaleDateString("es-MX", {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="font-mono text-emerald-500 text-sm font-bold">
                          ${h.totalAssets.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-rose-500 text-sm font-bold">
                          -${h.totalLiabilities.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-amber-500 text-sm font-bold">
                          -${h.totalBuckets.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            color={h.available >= 0 ? "success" : "danger"}
                            variant="flat"
                            size="sm"
                            className="font-bold font-mono"
                          >
                            ${h.available.toLocaleString()}
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

        {/* ── MOBILE FAB ──────────────────────────────────────── */}
        <div className="md:hidden">
          <button
            className={`fab ${fabOpen ? "fab-open" : ""}`}
            onClick={() => setFabOpen(!fabOpen)}
            aria-label={fabOpen ? "Cerrar menú" : "Agregar registro"}
          >
            {fabOpen ? <X size={24} /> : <Plus size={24} />}
          </button>

          {fabOpen && (
            <div className="fixed bottom-[148px] right-4 z-50 flex flex-col gap-2 items-end animate-fade-in-up">
              {[
                { label: "Activo",   color: "#10b981", action: () => { changeTab("dashboard"); setFabOpen(false); } },
                { label: "Gasto",    color: "#f43f5e", action: () => { changeTab("dashboard"); setFabOpen(false); } },
                { label: "Apartado", color: "#f59e0b", action: () => { changeTab("dashboard"); setFabOpen(false); } },
              ].map(({ label, color, action }) => (
                <button
                  key={label}
                  onClick={action}
                  className="glass flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-sm shadow-lg border border-white/20 hover:scale-105 transition-transform"
                  style={{ color }}
                >
                  <Plus size={14} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── MOBILE BOTTOM NAV ───────────────────────────────── */}
        <BottomNav active={activeTab} onChange={changeTab} />

        {/* ── HISTORY MODAL ───────────────────────────────────── */}
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
                            { label: "Activos",   value: selectedSnapshot.totalAssets,      color: "emerald", icon: <DollarSign size={20} /> },
                            { label: "Deudas",    value: selectedSnapshot.totalLiabilities, color: "rose",    icon: <ShieldAlert size={20} /> },
                            { label: "Apartados", value: selectedSnapshot.totalBuckets,     color: "amber",   icon: <Wallet size={20} /> },
                          ].map(({ label, value, color, icon }) => (
                            <Card key={label} className={`bg-${color}-500/10 border border-${color}-500/20`}>
                              <CardBody className="py-3 px-4 flex flex-row items-center justify-between">
                                <div>
                                  <p className={`text-xs text-${color}-600 dark:text-${color}-400 font-bold uppercase`}>{label}</p>
                                  <p className={`text-xl font-extrabold text-${color}-700 dark:text-${color}-300 font-mono`}>
                                    ${value.toLocaleString()}
                                  </p>
                                </div>
                                <div className={`p-2 bg-${color}-100 dark:bg-${color}-900/40 rounded-xl text-${color}-600`}>{icon}</div>
                              </CardBody>
                            </Card>
                          ))}
                        </div>
                      </div>

                      <Divider />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { label: "Activos",   items: selectedSnapshot.assets,      color: "emerald" },
                          { label: "Deudas",    items: selectedSnapshot.liabilities, color: "rose" },
                          { label: "Apartados", items: selectedSnapshot.buckets,     color: "amber" },
                        ].map(({ label, items, color }) => (
                          <div key={label}>
                            <h4 className={`font-bold text-sm mb-2 text-${color}-600 dark:text-${color}-400`}>{label}</h4>
                            <div className="space-y-1.5">
                              {items?.length ? items.map((item: FinanceItem, idx: number) => (
                                <div key={idx} className={`flex items-center gap-2 p-2 rounded-xl bg-${color}-500/10 border border-${color}-500/15`}>
                                  <div>
                                    <p className="text-xs font-bold text-default-700">{item.label}</p>
                                    <p className="text-[10px] text-default-400">{item.category}</p>
                                  </div>
                                  <span className={`ml-auto font-mono text-xs font-bold text-${color}-600`}>
                                    ${item.amount.toLocaleString()}
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
                  <Button color="danger" variant="light" onPress={onClose}>
                    Cerrar
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* DATA SETTINGS MODAL */}
        <Modal isOpen={isDataModalOpen} onOpenChange={onDataModalChange} backdrop="blur">
          <ModalContent className="glass border border-default-200">
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">Ajustes de Datos</ModalHeader>
                <ModalBody className="pb-6">
                  <p className="text-sm text-default-500 mb-4">
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
                      <Input 
                        type="file" 
                        accept=".json" 
                        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                        onChange={(e) => { importData(e); onClose(); }}
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
                      onPress={() => { clearHistory(); onClose(); }}
                    >
                      Limpiar Historial
                    </Button>
                  </div>
                </ModalBody>
              </>
            )}
          </ModalContent>
        </Modal>
      </SignedIn>
    </div>
  );
}