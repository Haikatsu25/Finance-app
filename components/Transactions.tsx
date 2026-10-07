"use client";

import React, { useMemo, useState } from "react";
import {
  Card, CardBody, Input, Button, Select, SelectItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
} from "@heroui/react";
import {
  ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight,
  Plus, Trash2, ReceiptText, ScanLine, Search, X, Pencil, Check, Download, Landmark, Repeat,
} from "lucide-react";
import { TransactionItem, FinanceItem } from "@/types";
import { money, moneyExact, round2 } from "@/lib/format";
import { monthKey, shiftMonth, monthLabel, summarizeMonth } from "@/lib/finance-utils";
import MonthlySummary from "./MonthlySummary";
import AddedByBadge from "./AddedByBadge";

export const EXPENSE_CATEGORIES = [
  "Comida", "Súper", "Transporte", "Hogar", "Servicios", "Salud",
  "Entretenimiento", "Ropa", "Educación", "Suscripción", "Otros",
];
export const INCOME_CATEGORIES = ["Nómina", "Freelance", "Venta", "Regalo", "Otros"];

/** Solo la primera letra en mayúscula: "octubre de 2026" → "Octubre de 2026" */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Exporta los movimientos visibles a CSV (compatible con Excel). */
function exportCsv(rows: TransactionItem[], accountName: (id?: string) => string | undefined) {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [
    ["Fecha", "Tipo", "Descripción", "Categoría", "Cuenta", "Monto", "Origen"].join(","),
    ...[...rows].sort((a, b) => a.date.localeCompare(b.date)).map((t) => [
      t.date,
      t.type === "income" ? "Ingreso" : "Gasto",
      esc(t.label),
      esc(t.category || ""),
      esc(accountName(t.accountId) || ""),
      (t.type === "income" ? t.amount : -t.amount).toFixed(2),
      t.source === "scan" ? "escaneado" : t.source === "fixed" ? "fijo" : "manual",
    ].join(",")),
  ];
  // BOM para que Excel abra acentos correctamente
  const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `movimientos-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Transactions({ transactions, onAdd, onRemove, onUpdate, viewerId, onScanRequest, accounts = [], extraExpenseCats = [], extraIncomeCats = [] }: {
  transactions: TransactionItem[];
  onAdd: (t: Omit<TransactionItem, "id">) => void;
  onRemove: (id: string) => void;
  onUpdate?: (id: string, patch: Partial<TransactionItem>) => void;
  viewerId?: string;
  onScanRequest?: () => void;
  /** Items de activos que funcionan como cuentas (efectivo, débito…) */
  accounts?: FinanceItem[];
  extraExpenseCats?: string[];
  extraIncomeCats?: string[];
}) {
  const expenseCats = [...EXPENSE_CATEGORIES.slice(0, -1), ...extraExpenseCats, "Otros"];
  const incomeCats = [...INCOME_CATEGORIES.slice(0, -1), ...extraIncomeCats, "Otros"];
  const allCats = Array.from(new Set([...expenseCats, ...incomeCats]));
  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.label;
  const [month, setMonth] = useState<string>(monthKey(new Date()));
  const [type, setType] = useState<"expense" | "income">("expense");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [accountId, setAccountId] = useState("none");

  // ── Búsqueda y filtros ──────────────────────────────────────
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const searching = search.trim().length > 0;
  const filtering = filterCat !== "all" || filterType !== "all";

  // ── Edición ─────────────────────────────────────────────────
  const [editTx, setEditTx] = useState<TransactionItem | null>(null);
  const [eLabel, setELabel] = useState("");
  const [eAmount, setEAmount] = useState("");
  const [eDate, setEDate] = useState("");
  const [eType, setEType] = useState<"expense" | "income">("expense");
  const [eCategory, setECategory] = useState("Otros");
  const [eAccountId, setEAccountId] = useState("none");

  const openEdit = (t: TransactionItem) => {
    setEditTried(false);
    setELabel(t.label);
    setEAmount(String(t.amount));
    setEDate(t.date);
    setEType(t.type);
    setECategory(t.category || "Otros");
    setEAccountId(t.accountId || "none");
    setEditTx(t);
  };

  const editParsed = round2(parseFloat(eAmount));
  const editLabelOk = !!eLabel.trim();
  const editAmountOk = Number.isFinite(editParsed) && editParsed > 0;
  const editDateOk = !!eDate;
  const editValid = editLabelOk && editAmountOk && editDateOk;
  // Solo se muestran los errores después de intentar guardar (no mientras se escribe)
  const [editTried, setEditTried] = useState(false);

  /** Devuelve true solo si guardó; así el modal no se cierra con datos inválidos */
  const saveEdit = (): boolean => {
    if (!editTx || !onUpdate || !editValid) return false;
    const parsed = editParsed;
    const editFuture = eDate > todayIso;
    onUpdate(editTx.id, { label: eLabel.trim(), amount: parsed, date: eDate, type: eType, category: eCategory, accountId: (eAccountId === "none" || editFuture) ? undefined : eAccountId });
    setEditTx(null);
    return true;
  };

  const cats = type === "expense" ? expenseCats : incomeCats;
  const amountValid = amount !== "" && Number.isFinite(parseFloat(amount)) && parseFloat(amount) > 0;
  const currentMonth = monthKey(new Date());
  const maxMonth = shiftMonth(currentMonth, 3);
  const viewingFuture = month > currentMonth;
  const todayIso = new Date().toISOString().split("T")[0];
  // Fecha efectiva: la que escribas; si no escribes ninguna y estás viendo
  // otro mes, se registra en ESE mes (día 1); si no, hoy.
  const effectiveDate = date || (!searching && month !== currentMonth ? `${month}-01` : todayIso);
  const dateIsFuture = effectiveDate > todayIso;

  const summary = useMemo(() => summarizeMonth(transactions, month), [transactions, month]);
  const prevSummary = useMemo(() => summarizeMonth(transactions, shiftMonth(month, -1)), [transactions, month]);

  // ── Lista filtrada (buscar cruza TODOS los meses) ───────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (!searching && monthKey(t.date) !== month) return false;
      if (q && !t.label.toLowerCase().includes(q) && !(t.category || "").toLowerCase().includes(q)) return false;
      if (filterCat !== "all" && (t.category || "Otros") !== filterCat) return false;
      if (filterType !== "all" && t.type !== filterType) return false;
      return true;
    });
  }, [transactions, month, search, searching, filterCat, filterType]);

  const filteredTotals = useMemo(() => {
    let exp = 0, inc = 0;
    for (const t of filtered) t.type === "income" ? (inc += t.amount) : (exp += t.amount);
    return { exp: round2(exp), inc: round2(inc), count: filtered.length };
  }, [filtered]);

  const grouped = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    const map = new Map<string, TransactionItem[]>();
    for (const t of sorted) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const submit = () => {
    if (!label.trim() || !amountValid) return;
    onAdd({
      label: label.trim(),
      amount: round2(parseFloat(amount)),
      date: effectiveDate,
      type,
      category,
      source: "manual",
      // Un gasto planeado (fecha futura) no toca el saldo de ninguna cuenta
      ...(accountId !== "none" && !dateIsFuture ? { accountId } : {}),
    });
    // Si registraste para otro mes, salta a ese mes para que lo veas
    if (monthKey(effectiveDate) !== month && !searching) setMonth(monthKey(effectiveDate));
    setLabel(""); setAmount(""); setDate("");
  };

  const clearFilters = () => { setSearch(""); setFilterCat("all"); setFilterType("all"); };

  return (
    <div className="space-y-4" id="transactions-section">
      {/* Header + navegación de mes */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-xl font-bold section-title">Movimientos</h3>
            <p className="text-xs text-default-500 mt-0.5">Cada peso que entra y sale</p>
          </div>
        </div>
        {!searching && (
          <div className="flex items-stretch rounded-[10px] border-2 border-foreground overflow-hidden">
            <button onClick={() => setMonth(shiftMonth(month, -1))} className="px-2.5 py-2 hover:bg-foreground/10 text-foreground" aria-label="Mes anterior">
              <ChevronLeft size={16} />
            </button>
            <span className="text-[13px] font-bold px-3 min-w-[130px] text-center self-center">{cap(monthLabel(month))}</span>
            <button
              onClick={() => setMonth(shiftMonth(month, 1))}
              disabled={month >= maxMonth}
              className="px-2.5 py-2 hover:bg-foreground/10 text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Resumen del mes (oculto durante búsqueda) */}
      {!searching && !filtering && !viewingFuture && <MonthlySummary summary={summary} prevSummary={prevSummary} />}

      {/* Mes futuro: lo que llevas comprometido */}
      {!searching && !filtering && viewingFuture && (
        <Card className="glass rule-ink shadow-none">
          <CardBody className="p-4 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex-1">
              <p className="text-sm font-bold">Plan de {monthLabel(month)}</p>
              <p className="text-xs text-default-500">
                Gastos que ya sabes que vienen. Se suman aquí y a tu proyección de flujo
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-xs font-semibold text-default-500">Comprometido</p>
                <p className="figure text-3xl text-money-out-text">{money(summary.expense)}</p>
              </div>
              {summary.income > 0 && (
                <div className="text-right">
                  <p className="text-xs font-semibold text-default-500">Ingresos esperados</p>
                  <p className="figure text-3xl text-money-in-text">{money(summary.income)}</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Búsqueda y filtros ───────────────────────────────── */}
      <Card className="glass shadow-none">
        <CardBody className="p-3 flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Buscar en todos los meses… (ej. uber, tacos)"
            size="sm"
            variant="bordered"
            startContent={<Search size={14} className="text-default-400" />}
            endContent={search && (
              <button onClick={() => setSearch("")} aria-label="Limpiar búsqueda">
                <X size={14} className="text-default-400 hover:text-default-600" />
              </button>
            )}
            value={search}
            onValueChange={setSearch}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Select size="sm" variant="bordered" aria-label="Filtrar categoría" className="w-36"
              selectedKeys={[filterCat]} onChange={(e) => setFilterCat(e.target.value || "all")}>
              <>
                <SelectItem key="all">Todas las categorías</SelectItem>
                <>{allCats.map((c) => <SelectItem key={c}>{c}</SelectItem>)}</>
              </>
            </Select>
            <Select size="sm" variant="bordered" aria-label="Filtrar tipo" className="w-28"
              selectedKeys={[filterType]} onChange={(e) => setFilterType(e.target.value || "all")}>
              <SelectItem key="all">Todo</SelectItem>
              <SelectItem key="expense">Gastos</SelectItem>
              <SelectItem key="income">Ingresos</SelectItem>
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* Resultados de búsqueda/filtro */}
      {(searching || filtering) && (
        <div className="flex items-center justify-between gap-2 flex-wrap px-1">
          <p className="text-xs text-default-500">
            <span className="font-bold text-foreground">{filteredTotals.count}</span> resultado{filteredTotals.count !== 1 && "s"}
            {searching && <span className="text-default-500"> en todos los meses</span>}
            {": "}gastos <span className="font-bold tnum text-money-out-text">{money(filteredTotals.exp)}</span>
            {filteredTotals.inc > 0 && <>, ingresos <span className="font-bold tnum text-money-in-text">{money(filteredTotals.inc)}</span></>}
          </p>
          <Button size="sm" variant="light" className="text-default-500 h-7" startContent={<X size={12} />} onPress={clearFilters}>
            Limpiar
          </Button>
        </div>
      )}

      {/* Captura */}
      <Card className="glass shadow-none">
        <CardBody className="p-4">
          <div className="flex flex-col lg:flex-row lg:flex-wrap gap-2">
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => { setType("expense"); setCategory(EXPENSE_CATEGORIES[0]); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  type === "expense" ? "bg-money-out text-white" : "bg-default-100 text-default-500"
                }`}
              >
                <ArrowDownCircle size={14} /> Gasto
              </button>
              <button
                onClick={() => { setType("income"); setCategory(INCOME_CATEGORIES[0]); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  type === "income" ? "bg-money-in text-(--slab-in-fg)" : "bg-default-100 text-default-500"
                }`}
              >
                <ArrowUpCircle size={14} /> Ingreso
              </button>
            </div>
            <Input placeholder="¿En qué?" size="sm" variant="bordered" className="lg:flex-1 lg:min-w-[180px] lg:basis-[180px]" value={label} onValueChange={setLabel} />
            <div className="flex gap-2 flex-wrap">
              <Input
                type="number" min="0" inputMode="decimal" placeholder="0.00" size="sm" variant="bordered"
                startContent={<span className="text-default-400 text-xs font-bold">$</span>}
                className="w-28" value={amount} onValueChange={setAmount}
              />
              <Select size="sm" variant="bordered" aria-label="Categoría" className="w-36"
                selectedKeys={[category]} onChange={(e) => setCategory(e.target.value || cats[0])}>
                {cats.map((c) => <SelectItem key={c}>{c}</SelectItem>)}
              </Select>
              <Input type="date" size="sm" variant="bordered" aria-label="Fecha" className="w-[130px]" value={date} onValueChange={setDate} />
              {accounts.length > 0 && (
                <Select size="sm" variant="bordered" aria-label="Cuenta"
                  startContent={<Landmark size={13} className="text-default-400 shrink-0" />}
                  className="w-40"
                  selectedKeys={[accountId]} onChange={(e) => setAccountId(e.target.value || "none")}>
                  <>
                    <SelectItem key="none" textValue="Sin cuenta">Sin cuenta</SelectItem>
                    <>{accounts.map((a) => <SelectItem key={a.id} textValue={a.label}>{a.label}</SelectItem>)}</>
                  </>
                </Select>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" color={type === "expense" ? "danger" : "success"} variant="solid"
                className="font-bold flex-1 lg:flex-none" isDisabled={!label.trim() || !amountValid}
                startContent={<Plus size={14} />} onPress={submit}>
                Registrar
              </Button>
              {onScanRequest && (
                <Button size="sm" variant="flat" color="secondary" className="font-bold"
                  startContent={<ScanLine size={14} />} onPress={onScanRequest}>
                  Escanear ticket
                </Button>
              )}
              <Button size="sm" variant="flat" className="font-bold text-default-500"
                isDisabled={filtered.length === 0}
                startContent={<Download size={14} />} onPress={() => exportCsv(filtered, accountName)}>
                CSV
              </Button>
            </div>
          </div>
          {dateIsFuture && (
            <p className="text-[11px] text-foreground font-semibold mt-2">
              Se registrará como {type === "income" ? "ingreso esperado" : "gasto planeado"} de {monthLabel(monthKey(effectiveDate))}
              {!date && <> (día 1; puedes elegir otro día con el campo de fecha)</>}
              . Aparecerá en ese mes y en tu proyección de flujo, sin mover tus cuentas todavía.
            </p>
          )}
          {!dateIsFuture && !date && month !== currentMonth && !searching && (
            <p className="text-[11px] text-default-500 font-semibold mt-2">
              Se registrará en {monthLabel(month)} (día 1). Elige otro día con el campo de fecha si quieres.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Lista agrupada por día */}
      <Card className="glass shadow-none">
        <CardBody className="p-0">
          {grouped.length === 0 ? (
            <div className="py-14 text-center text-default-400">
              <ReceiptText size={32} className="mx-auto mb-2 opacity-30" />
              {searching || filtering ? (
                <p className="text-sm">Nada coincide con tu búsqueda</p>
              ) : (
                <>
                  <p className="text-sm">{viewingFuture ? `Sin gastos planeados para ${monthLabel(month)}` : `Sin movimientos en ${monthLabel(month)}`}</p>
                  <p className="text-xs mt-1">{viewingFuture ? "Registra arriba con la fecha de ese mes lo que ya sabes que viene" : "Registra tu primer gasto o ingreso arriba"}</p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-default-200">
              {grouped.map(([day, items]) => {
                const dayTotal = items.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
                return (
                  <div key={day} className="px-4 py-3">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-bold">
                        {cap(new Date(day + "T12:00:00").toLocaleDateString("es-MX", {
                          weekday: "long", day: "numeric", month: "short",
                          ...(searching ? { year: "numeric" } : {}),
                        }))}
                      </p>
                      <span className={`figure text-xl ${dayTotal >= 0 ? "text-money-in-text" : "text-money-out-text"}`}>
                        {dayTotal >= 0 ? "+" : "−"}{money(Math.abs(dayTotal))}
                      </span>
                    </div>
                    <div>
                      {items.map((t) => (
                        <div key={t.id} className="group flex items-center gap-3 py-2.5 border-b border-default-200 last:border-b-0">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold truncate">{t.label}</p>
                            <p className="text-[11px] text-default-500 flex items-center gap-x-2 gap-y-0.5 flex-wrap">
                              {t.category || "Sin categoría"}
                              {t.source === "scan" && <span className="inline-flex items-center gap-1"><ScanLine size={11} aria-hidden /> escaneado</span>}
                              {t.source === "fixed" && <span className="inline-flex items-center gap-1"><Repeat size={11} aria-hidden /> fijo</span>}
                              {t.accountId && accountName(t.accountId) && (
                                <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Landmark size={11} aria-hidden /> {accountName(t.accountId)}</span>
                              )}
                              <AddedByBadge addedBy={t.addedBy} viewerId={viewerId} />
                            </p>
                          </div>
                          <span className={`figure text-[1.35rem] shrink-0 ${t.type === "income" ? "text-money-in-text" : "text-foreground"}`}>
                            {t.type === "income" ? "+" : "−"}{moneyExact(t.amount)}
                          </span>
                          <div className="flex items-center shrink-0">
                            {onUpdate && (
                              <button
                                onClick={() => openEdit(t)}
                                className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 text-default-500 hover:text-foreground transition-colors p-1.5 rounded-md hover:bg-foreground/10"
                                aria-label={`Editar ${t.label}`}
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => onRemove(t.id)}
                              className="opacity-70 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 text-default-500 hover:text-money-out-text transition-colors p-1.5 rounded-md hover:bg-money-out/10"
                              aria-label={`Eliminar ${t.label}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ── Modal de edición ──────────────────────────────────── */}
      <Modal isOpen={editTx !== null} onOpenChange={(o) => { if (!o) setEditTx(null); }} backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Pencil size={17} className="text-foreground" />
                Editar movimiento
              </ModalHeader>
              <ModalBody>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setEType("expense"); if (!EXPENSE_CATEGORIES.includes(eCategory)) setECategory(EXPENSE_CATEGORIES[0]); }}
                    className={`flex-1 min-h-11 rounded-lg text-sm font-bold transition-colors ${eType === "expense" ? "bg-money-out text-white" : "bg-default-100 text-default-700"}`}
                  >
                    Gasto
                  </button>
                  <button
                    onClick={() => { setEType("income"); if (!INCOME_CATEGORIES.includes(eCategory)) setECategory(INCOME_CATEGORIES[0]); }}
                    className={`flex-1 min-h-11 rounded-lg text-sm font-bold transition-colors ${eType === "income" ? "bg-money-in text-(--slab-in-fg)" : "bg-default-100 text-default-700"}`}
                  >
                    Ingreso
                  </button>
                </div>
                <Input label="Descripción" variant="bordered" value={eLabel} onValueChange={setELabel}
                  isInvalid={editTried && !editLabelOk} errorMessage="Escribe una descripción." />
                <div className="flex gap-2 items-start">
                  <Input label="Monto" type="number" min="0" inputMode="decimal" variant="bordered"
                    startContent={<span className="text-default-500 text-xs">$</span>}
                    value={eAmount} onValueChange={setEAmount} className="flex-1"
                    isInvalid={editTried && !editAmountOk} errorMessage="Escribe un monto mayor a 0." />
                  <Input label="Fecha" type="date" variant="bordered" value={eDate} onValueChange={setEDate} className="w-[160px]"
                    isInvalid={editTried && !editDateOk} errorMessage="Elige una fecha válida." />
                </div>
                <Select label="Categoría" variant="bordered"
                  selectedKeys={eCategory ? [eCategory] : []}
                  onChange={(e) => setECategory(e.target.value || "Otros")}>
                  {(eType === "expense" ? expenseCats : incomeCats).map((c) => <SelectItem key={c}>{c}</SelectItem>)}
                </Select>
                {accounts.length > 0 && (
                  <Select label="Cuenta" variant="bordered"
                    selectedKeys={[eAccountId]}
                    onChange={(e) => setEAccountId(e.target.value || "none")}>
                    <>
                      <SelectItem key="none" textValue="Sin cuenta">Sin cuenta</SelectItem>
                      <>{accounts.map((a) => <SelectItem key={a.id} textValue={a.label}>{a.label}</SelectItem>)}</>
                    </>
                  </Select>
                )}
              </ModalBody>
              <ModalFooter>
                {editTried && !editValid && (
                  <p role="alert" className="text-xs font-semibold text-money-out-text mr-auto">Revisa los campos marcados.</p>
                )}
                <Button variant="light" className="h-11 font-semibold" onPress={onClose}>Cancelar</Button>
                {/* Siempre activo: con datos inválidos no cierra y marca qué corregir (antes quedaba
                    deshabilitado sin explicar por qué) */}
                <Button color="primary" variant="solid" className="font-bold h-11"
                  startContent={<Check size={15} />}
                  onPress={() => {
                    if (!editValid) { setEditTried(true); return; }
                    if (saveEdit()) onClose();
                  }}>
                  Guardar cambios
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
