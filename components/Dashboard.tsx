"use client";

import React, { useState, useEffect } from "react";
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
  Spacer,
  Chip,
  Progress,
  Select,
  SelectItem,
} from "@heroui/react";
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
  HelpCircle
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { FinanceItem, HistorySnapshot } from "@/types";
import { UserButton, SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import Analytics from "./Analytics";
import { startTour } from "./Tutorial";

export default function Dashboard() {
  const [assets, setAssets] = useState<FinanceItem[]>([]);
  const [liabilities, setLiabilities] = useState<FinanceItem[]>([]);
  const [buckets, setBuckets] = useState<FinanceItem[]>([]);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { theme, resolvedTheme } = useTheme();

  // Load data from MongoDB on mount
  useEffect(() => {
    setMounted(true);
    const fetchData = async () => {
      try {
        const res = await fetch('/api/finance');
        if (res.ok) {
          const data = await res.json();
          setAssets(data.assets || []);
          setLiabilities(data.liabilities || []);
          setBuckets(data.buckets || []);
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

  // First time tour trigger (optional, could use localStorage to only show once)
  useEffect(() => {
    if (!isLoading && mounted && assets.length === 0 && liabilities.length === 0 && buckets.length === 0) {
      // Could auto-start tour here for empty state users
    }
  }, [isLoading, mounted, assets, liabilities, buckets]);

  const saveData = async (newAssets: any, newLiabilities: any, newBuckets: any, newHistory: any) => {
    try {
      await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assets: newAssets,
          liabilities: newLiabilities,
          buckets: newBuckets,
          history: newHistory
        })
      });
    } catch (error) {
      console.error("Failed to save data:", error);
    }
  };

  useEffect(() => {
    if (!mounted || isLoading) return;
    const timer = setTimeout(() => {
      saveData(assets, liabilities, buckets, history);
    }, 1000);
    return () => clearTimeout(timer);
  }, [assets, liabilities, buckets, history, mounted, isLoading]);

  const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, item) => sum + item.amount, 0);
  const totalBuckets = buckets.reduce((sum, item) => sum + item.amount, 0);

  const available = totalAssets - totalLiabilities - totalBuckets;
  const displayAvailable = available;

  const handleAddItem = (
    type: "asset" | "liability" | "bucket",
    label: string,
    amount: string,
    date: string,
    category: string
  ) => {
    const item: FinanceItem = {
      id: crypto.randomUUID(),
      label: label,
      amount: parseFloat(amount),
      date: date || new Date().toISOString().split("T")[0],
      type,
      category
    };

    if (type === "asset") setAssets([...assets, item]);
    if (type === "liability") setLiabilities([...liabilities, item]);
    if (type === "bucket") setBuckets([...buckets, item]);
  };

  const removeItem = (id: string, type: "asset" | "liability" | "bucket") => {
    if (type === "asset") setAssets(assets.filter((i) => i.id !== id));
    if (type === "liability") setLiabilities(liabilities.filter((i) => i.id !== id));
    if (type === "bucket") setBuckets(buckets.filter((i) => i.id !== id));
  };

  const saveSnapshot = () => {
    const snapshot: HistorySnapshot = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      totalAssets,
      totalLiabilities,
      totalBuckets,
      available: displayAvailable,
      deficit: available < 0 ? Math.abs(available) : 0,
    };
    setHistory([snapshot, ...history]);
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear the history?")) {
      setHistory([]);
    }
  };

  const handleStartTour = () => {
    const isDark = resolvedTheme === 'dark';
    startTour(isDark);
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary-100 selection:text-primary-900 transition-colors duration-300">

      {/* Top Navigation Bar */}
      <nav className="w-full border-b border-divider bg-content1/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Wallet className="text-primary w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Finance Control</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              isIconOnly
              variant="light"
              onPress={handleStartTour}
              className="text-default-500 hover:text-primary"
              id="tour-welcome"
              aria-label="Iniciar Tour"
            >
              <HelpCircle size={22} />
            </Button>
            <ThemeSwitcher />
            <SignedIn>
              <UserButton />
            </SignedIn>
          </div>
        </div>
      </nav>

      <SignedOut>
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
            Controla tus finanzas
          </h1>
          <p className="text-xl text-default-500 mb-8 max-w-2xl">
            Gestiona tus activos, pasivos y apartados de forma inteligente y segura.
          </p>
          <SignInButton mode="modal">
            <Button size="lg" color="primary" variant="shadow" className="font-bold">
              Iniciar Sesión
            </Button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <main className="max-w-6xl mx-auto p-6 space-y-8">

          {/* Hero Section: Financial Overview */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Main Available Balance Card */}
            <Card id="balance-card" className={`col-span-1 md:col-span-8 border-none shadow-2xl bg-gradient-to-br ${displayAvailable >= 0 ? 'from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-800' : 'from-rose-500 to-red-600 dark:from-rose-600 dark:to-red-800'}`}>
              <CardBody className="py-10 px-8 flex flex-col justify-center items-start">
                <p className={`${displayAvailable >= 0 ? 'text-emerald-100' : 'text-rose-100'} font-semibold text-sm tracking-wider uppercase mb-2 flex items-center gap-2`}>
                  <PiggyBank size={18} />
                  {displayAvailable >= 0 ? 'Disponible (Neto)' : 'Déficit (Negativo)'}
                </p>
                <h2 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-sm">
                  ${displayAvailable.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </h2>
                <div className="mt-6 flex gap-3">
                  <Button
                    id="save-snapshot-btn"
                    variant="solid"
                    className="bg-white/20 text-white backdrop-blur-md border border-white/30 font-semibold hover:bg-white/30"
                    startContent={<Save size={18} />}
                    onPress={saveSnapshot}
                  >
                    Guardar Snapshot
                  </Button>
                  <Button
                    variant="light"
                    className="text-white hover:bg-white/10"
                    isIconOnly
                    startContent={<History size={20} />}
                    onPress={() => document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' })}
                  />
                </div>
              </CardBody>
            </Card>

            {/* Quick Stats Grid */}
            <div className="col-span-1 md:col-span-4 flex flex-col gap-4">
              <Card className="flex-1 bg-content1 border border-divider shadow-sm">
                <CardBody className="flex flex-row justify-between items-center p-6">
                  <div>
                    <p className="text-default-500 text-xs font-bold uppercase">Total Activos</p>
                    <p className="text-2xl font-bold text-emerald-500">
                      ${totalAssets.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-600">
                    <TrendingUp size={24} />
                  </div>
                </CardBody>
              </Card>
              <Card className="flex-1 bg-content1 border border-divider shadow-sm">
                <CardBody className="flex flex-row justify-between items-center p-6">
                  <div>
                    <p className="text-default-500 text-xs font-bold uppercase">Total Gastos/Deudas</p>
                    <p className="text-2xl font-bold text-rose-500">
                      ${totalLiabilities.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-rose-500/10 rounded-full text-rose-600">
                    <TrendingDown size={24} />
                  </div>
                </CardBody>
              </Card>
              <Card className="flex-1 bg-content1 border border-divider shadow-sm">
                <CardBody className="flex flex-row justify-between items-center p-6">
                  <div>
                    <p className="text-default-500 text-xs font-bold uppercase">Total Apartados</p>
                    <p className="text-2xl font-bold text-amber-500">
                      ${totalBuckets.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-full text-amber-600">
                    <Wallet size={24} />
                  </div>
                </CardBody>
              </Card>
            </div>
          </section>

          <Divider className="my-8" />

          {/* Analytics Section */}
          <Analytics
            history={history}
            assets={assets}
            liabilities={liabilities}
            isDark={resolvedTheme === 'dark'}
          />

          <Divider className="my-8" />

          {/* Management Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start" id="management-sections">

            <Section
              title="Ingresos & Activos"
              description="Cuentas, efectivo, inversiones"
              icon={<DollarSign size={20} />}
              items={assets}
              total={totalAssets}
              color="success" // HeroUI semantic color
              categories={["Efectivo", "Banco", "Inversión", "Propiedad", "Otros"]}
              onAdd={(l: string, a: string, d: string, c: string) => handleAddItem("asset", l, a, d, c)}
              onRemove={(id: string) => removeItem(id, "asset")}
            />

            <Section
              title="Gastos & Deudas"
              description="Tarjetas, préstamos, pendientes"
              icon={<ShieldAlert size={20} />}
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
              icon={<Wallet size={20} />}
              items={buckets}
              total={totalBuckets}
              color="warning"
              categories={["Emergencia", "Viaje", "Auto", "Regalos", "Ahorro", "Otros"]}
              onAdd={(l: string, a: string, d: string, c: string) => handleAddItem("bucket", l, a, d, c)}
              onRemove={(id: string) => removeItem(id, "bucket")}
            />
          </div>

          {/* History Section */}
          <section id="history-section" className="pt-10">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h3 className="text-2xl font-bold">Historial</h3>
                <p className="text-default-500">Registro de balances mensuales</p>
              </div>
              <Button size="sm" color="danger" variant="light" startContent={<Trash2 size={16} />} onPress={clearHistory}>
                Limpiar
              </Button>
            </div>

            <Card className="border border-divider shadow-sm">
              <Table
                aria-label="History Table"
                removeWrapper
                className="bg-content1"
                color="primary"
                selectionMode="none"
              >
                <TableHeader>
                  <TableColumn>FECHA</TableColumn>
                  <TableColumn>ACTIVOS</TableColumn>
                  <TableColumn>GASTOS</TableColumn>
                  <TableColumn>APARTADOS</TableColumn>
                  <TableColumn>DISPONIBLE</TableColumn>
                </TableHeader>
                <TableBody emptyContent="No hay historial guardado.">
                  {history.map((h) => (
                    <TableRow key={h.id} className="border-b border-divider last:border-none">
                      <TableCell className="font-medium text-default-700">
                        {new Date(h.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </TableCell>
                      <TableCell>${h.totalAssets.toLocaleString()}</TableCell>
                      <TableCell className="text-rose-500">-${h.totalLiabilities.toLocaleString()}</TableCell>
                      <TableCell className="text-amber-500">-${h.totalBuckets.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip color={h.available >= 0 ? "success" : "danger"} variant="flat" size="sm" className="font-bold">
                          ${h.available.toLocaleString()}
                        </Chip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </section>

        </main>
      </SignedIn>
    </div>
  );
}

// Reusable Section Component
function Section({ title, description, icon, items, total, color, categories, onAdd, onRemove }: any) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState(categories[0]);

  const handleAdd = () => {
    if (!label || !amount) return;
    onAdd(label, amount, date, category);
    setLabel("");
    setAmount("");
    setDate("");
    setCategory(categories[0]);
  };

  const mapColorToTextColor = (c: string) => {
    if (c === 'success') return 'text-emerald-500';
    if (c === 'danger') return 'text-rose-500';
    if (c === 'warning') return 'text-amber-500';
    return 'text-default-500';
  }

  const textColorClass = mapColorToTextColor(color);

  return (
    <Card className="h-full bg-content1 border border-divider shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-col items-start px-6 pt-6 pb-0 gap-1">
        <div className={`p-2 rounded-lg bg-${color === 'warning' ? 'amber' : (color === 'success' ? 'emerald' : 'rose')}-500/10 mb-2`}>
          <div className={textColorClass}>
            {icon}
          </div>
        </div>
        <div className="flex justify-between w-full items-center">
          <h3 className="text-lg font-bold">{title}</h3>
          <span className={`text-lg font-mono font-bold ${textColorClass}`}>
            ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <p className="text-small text-default-400">{description}</p>
      </CardHeader>

      <CardBody className="px-6 py-4 flex flex-col gap-4">
        {/* List */}
        <div className="flex-grow space-y-3 min-h-[100px]">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-default-300 py-6 border-2 border-dashed border-default-100 rounded-xl">
              <p className="text-sm">Sin registros</p>
            </div>
          ) : (
            items.map((item: FinanceItem) => (
              <div key={item.id} className="group flex justify-between items-center p-3 rounded-xl bg-default-50 hover:bg-default-100 transition-colors border border-transparent hover:border-default-200">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-default-700">{item.label}</span>
                  <div className="flex items-center gap-2">
                    {item.category && <Chip size="sm" variant="flat" className="text-[10px] h-5">{item.category}</Chip>}
                    {item.date && <span className="text-[10px] text-default-400 uppercase tracking-wide">{item.date}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-medium text-default-900">${item.amount.toLocaleString()}</span>
                  <button
                    onClick={() => onRemove(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-default-400 hover:text-danger transition-all p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <Divider />

        {/* Input Form */}
        <div className="space-y-3 pt-2">
          <Input
            placeholder="Descripción"
            size="sm"
            variant="faded"
            value={label}
            onValueChange={setLabel}
          />
          <Select
            placeholder="Categoría"
            size="sm"
            variant="faded"
            selectedKeys={[category]}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((cat: string) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </Select>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="0.00"
              size="sm"
              variant="faded"
              startContent={<span className="text-default-400 text-xs">$</span>}
              className="flex-1"
              value={amount}
              onValueChange={setAmount}
            />
            <Input
              type="date"
              size="sm"
              variant="faded"
              className="w-[130px]"
              value={date}
              onValueChange={setDate}
            />
          </div>
          <Button
            fullWidth
            color={color as any}
            variant="flat"
            onPress={handleAdd}
            className="font-medium"
            size="sm"
            isDisabled={!label || !amount}
          >
            Agregar
          </Button>
        </div>

      </CardBody>
    </Card>
  );
}