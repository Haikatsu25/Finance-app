"use client";

import React, { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import {
  ChevronLeft, ChevronRight,
  Trash2, ScanLine, Search, X, Pencil, Check, Download, Landmark, Repeat,
  ShoppingBag, Car, Tv, Shirt, HeartPulse, House, Zap, GraduationCap, Banknote, CircleDollarSign,
} from "lucide-react";
import { TransactionItem, FinanceItem } from "@/types";
import { money, moneyExact, round2 } from "@/lib/format";
import { monthKey, shiftMonth, monthLabel, summarizeMonth, todayIso as todayLocal } from "@/lib/finance-utils";
import MonthlySummary from "./MonthlySummary";
import AddedByBadge from "./AddedByBadge";

export const EXPENSE_CATEGORIES = [
  "Comida", "Súper", "Transporte", "Hogar", "Servicios", "Salud",
  "Entretenimiento", "Ropa", "Educación", "Suscripción", "Otros",
];
export const INCOME_CATEGORIES = ["Nómina", "Freelance", "Venta", "Regalo", "Otros"];

/** Ícono de la fila según la categoría (decorativo) */
function catIcon(t: TransactionItem): React.ReactNode {
  const p = { size: 18, "aria-hidden": true } as const;
  if (t.type === "income") return <Banknote {...p} />;
  switch (t.category) {
    case "Comida": case "Súper": return <ShoppingBag {...p} />;
    case "Transporte": return <Car {...p} />;
    case "Entretenimiento": return <Tv {...p} />;
    case "Ropa": return <Shirt {...p} />;
    case "Salud": return <HeartPulse {...p} />;
    case "Hogar": return <House {...p} />;
    case "Servicios": return <Zap {...p} />;
    case "Educación": return <GraduationCap {...p} />;
    case "Suscripción": return <Repeat {...p} />;
    default: return <CircleDollarSign {...p} />;
  }
}

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
  a.download = `movimientos-${todayLocal()}.csv`;
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
  const todayIso = todayLocal();
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
    <>
      {/* Encabezado y navegación de mes */}
      <div className="wide flex items-center justify-between gap-2 px-0.5" id="transactions-section">
        <h2 className="sec sec-lg">Movimientos</h2>
        {!searching && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMonth(shiftMonth(month, -1))}
              className="size-10 grid place-items-center rounded-full bg-(--track) text-foreground"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
            <b className="text-[16px] font-extrabold min-w-[116px] text-center">{cap(monthLabel(month))}</b>
            <button
              onClick={() => setMonth(shiftMonth(month, 1))}
              disabled={month >= maxMonth}
              className="size-10 grid place-items-center rounded-full bg-(--track) text-foreground disabled:opacity-30"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={18} aria-hidden />
            </button>
          </div>
        )}
      </div>

      {/* Resumen del mes (oculto durante búsqueda) */}
      {!searching && !filtering && !viewingFuture && <MonthlySummary summary={summary} prevSummary={prevSummary} />}

      {/* Mes futuro: lo que llevas comprometido */}
      {!searching && !filtering && viewingFuture && (
        <section className="pop-card">
          <div className="sec-h">
            <h2 className="sec">Plan de {monthLabel(month)}</h2>
          </div>
          <p className="summary">
            Gastos que ya sabes que vienen. Se suman aquí y a tu proyección de flujo.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="kv">
              <small>Comprometido</small>
              <b className="num text-money-out-text">{money(summary.expense)}</b>
            </div>
            {summary.income > 0 && (
              <div className="kv">
                <small>Ingresos esperados</small>
                <b className="num text-money-in-text">{money(summary.income)}</b>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Búsqueda, filtros y captura ─────────────────────── */}
      <section className="pop-card">
        <div className="search">
          <Search size={16} aria-hidden />
          <input
            placeholder="Buscar en todos los meses (ej. uber, tacos)"
            aria-label="Buscar movimientos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Limpiar búsqueda" className="grid place-items-center size-9 rounded-full">
              <X size={14} aria-hidden />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <select className="field-pill" aria-label="Filtrar categoría" value={filterCat} onChange={(e) => setFilterCat(e.target.value || "all")}>
            <option value="all">Todas las categorías</option>
            {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="field-pill" aria-label="Filtrar tipo" value={filterType} onChange={(e) => setFilterType(e.target.value || "all")}>
            <option value="all">Todo</option>
            <option value="expense">Gastos</option>
            <option value="income">Ingresos</option>
          </select>
        </div>

        {/* Resultados de búsqueda/filtro */}
        {(searching || filtering) && (
          <div className="flex items-center justify-between gap-2 flex-wrap mt-3">
            <p className="text-xs mute">
              <b className="text-foreground">{filteredTotals.count}</b> resultado{filteredTotals.count !== 1 && "s"}
              {searching && " en todos los meses"}
              {": "}gastos <b className="tnum text-money-out-text">{money(filteredTotals.exp)}</b>
              {filteredTotals.inc > 0 && <>, ingresos <b className="tnum text-money-in-text">{money(filteredTotals.inc)}</b></>}
            </p>
            <button type="button" className="btn soft sm" onClick={clearFilters}>
              <X size={12} aria-hidden /> Limpiar
            </button>
          </div>
        )}

        <form
          className="mt-3 flex flex-col gap-2.5"
          onSubmit={(e) => { e.preventDefault(); submit(); }}
        >
          <div className={`seg ${type === "expense" ? "out" : "in"}`} role="group" aria-label="Tipo de movimiento">
            <button type="button" aria-pressed={type === "expense"} onClick={() => { setType("expense"); setCategory(EXPENSE_CATEGORIES[0]); }}>
              Gasto
            </button>
            <button type="button" aria-pressed={type === "income"} onClick={() => { setType("income"); setCategory(INCOME_CATEGORIES[0]); }}>
              Ingreso
            </button>
          </div>
          <div className="f">
            <input placeholder="¿En qué?" aria-label="¿En qué?" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="row2">
            <div className="f">
              <input
                type="number" min="0" inputMode="decimal" placeholder="$ 0.00" aria-label="Monto"
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="f">
              <input type="date" aria-label="Fecha" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className={accounts.length > 0 ? "row2" : ""}>
            <div className="f">
              <select aria-label="Categoría" value={category} onChange={(e) => setCategory(e.target.value || cats[0])}>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {accounts.length > 0 && (
              <div className="f">
                <select aria-label="Cuenta" value={accountId} onChange={(e) => setAccountId(e.target.value || "none")}>
                  <option value="none">Sin cuenta</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button className="btn flex-1" type="submit" disabled={!label.trim() || !amountValid}>
              Registrar
            </button>
            {onScanRequest && (
              <button className="btn soft" type="button" onClick={onScanRequest} aria-label="Escanear ticket" title="Escanear ticket">
                <ScanLine size={18} aria-hidden />
              </button>
            )}
            <button
              className="btn soft" type="button" disabled={filtered.length === 0}
              onClick={() => exportCsv(filtered, accountName)} aria-label="Exportar CSV" title="Exportar CSV"
            >
              <Download size={18} aria-hidden />
            </button>
          </div>
        </form>

        {dateIsFuture && (
          <p className="text-[12px] font-semibold mt-2.5">
            Se registrará como {type === "income" ? "ingreso esperado" : "gasto planeado"} de {monthLabel(monthKey(effectiveDate))}
            {!date && <> (día 1; puedes elegir otro día con el campo de fecha)</>}
            . Aparecerá en ese mes y en tu proyección de flujo, sin mover tus cuentas todavía.
          </p>
        )}
        {!dateIsFuture && !date && month !== currentMonth && !searching && (
          <p className="text-[12px] mute font-semibold mt-2.5">
            Se registrará en {monthLabel(month)} (día 1). Elige otro día con el campo de fecha si quieres.
          </p>
        )}
      </section>

      {/* Lista agrupada por día */}
      <div className="wide flex flex-col gap-3.5">
        {grouped.length === 0 ? (
          <div className="empty">
            {searching || filtering ? (
              "Nada coincide con tu búsqueda."
            ) : viewingFuture ? (
              `Sin gastos planeados para ${monthLabel(month)}. Registra arriba con la fecha de ese mes lo que ya sabes que viene.`
            ) : (
              `Sin movimientos en ${monthLabel(month)}. Registra tu primer gasto o ingreso arriba.`
            )}
          </div>
        ) : (
          grouped.map(([day, items]) => {
            const dayTotal = items.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);
            return (
              <div key={day}>
                <div className="day">
                  <b>
                    {cap(new Date(day + "T12:00:00").toLocaleDateString("es-MX", {
                      weekday: "long", day: "numeric", month: "short",
                      ...(searching ? { year: "numeric" } : {}),
                    }))}
                  </b>
                  <span className={`num ${dayTotal >= 0 ? "text-money-in-text" : "text-money-out-text"}`}>
                    {dayTotal >= 0 ? "+" : "−"}{money(Math.abs(dayTotal))}
                  </span>
                </div>
                <div className="pop-card list" style={{ padding: 8 }}>
                  {items.map((t) => (
                    <div key={t.id} className="it">
                      <i aria-hidden>{catIcon(t)}</i>
                      <div className="t">
                        <b>{t.label}</b>
                        <small className="flex items-center gap-x-2 gap-y-0.5 flex-wrap">
                          <span>{t.category || "Sin categoría"}</span>
                          {t.source === "scan" && <span className="inline-flex items-center gap-1"><ScanLine size={11} aria-hidden /> escaneado</span>}
                          {t.source === "fixed" && <span className="inline-flex items-center gap-1"><Repeat size={11} aria-hidden /> fijo</span>}
                          {t.accountId && accountName(t.accountId) && (
                            <span className="inline-flex items-center gap-1 font-semibold text-foreground"><Landmark size={11} aria-hidden /> {accountName(t.accountId)}</span>
                          )}
                          <AddedByBadge addedBy={t.addedBy} viewerId={viewerId} />
                        </small>
                      </div>
                      <div className={`amt ${t.type === "income" ? "text-money-in-text" : ""}`}>
                        {t.type === "income" ? "+" : "−"}{moneyExact(t.amount)}
                      </div>
                      <div className="acts">
                        {onUpdate && (
                          <button onClick={() => openEdit(t)} aria-label={`Editar ${t.label}`}>
                            <Pencil size={15} aria-hidden />
                          </button>
                        )}
                        <button onClick={() => onRemove(t.id)} aria-label={`Eliminar ${t.label}`}>
                          <Trash2 size={15} aria-hidden />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Hoja de edición ──────────────────────────────────── */}
      <Sheet open={editTx !== null} onOpenChange={(o) => { if (!o) setEditTx(null); }} title="Editar movimiento">
        <form
          className="flex flex-col gap-3" noValidate
          onSubmit={(e) => {
            e.preventDefault();
            // Siempre activo: con datos inválidos no cierra y marca qué corregir
            if (!editValid) { setEditTried(true); return; }
            saveEdit();
          }}
        >
          <div className={`seg ${eType === "expense" ? "out" : "in"}`} role="group" aria-label="Tipo de movimiento">
            <button type="button" aria-pressed={eType === "expense"}
              onClick={() => { setEType("expense"); if (!EXPENSE_CATEGORIES.includes(eCategory)) setECategory(EXPENSE_CATEGORIES[0]); }}>
              Gasto
            </button>
            <button type="button" aria-pressed={eType === "income"}
              onClick={() => { setEType("income"); if (!INCOME_CATEGORIES.includes(eCategory)) setECategory(INCOME_CATEGORIES[0]); }}>
              Ingreso
            </button>
          </div>

          <div className="f">
            <label htmlFor="tx-e-label">Descripción</label>
            <input id="tx-e-label" value={eLabel} onChange={(e) => setELabel(e.target.value)}
              className={editTried && !editLabelOk ? "err" : ""} aria-invalid={editTried && !editLabelOk} />
            {editTried && !editLabelOk && <p className="err-msg">Escribe una descripción.</p>}
          </div>
          <div className="row2" style={{ alignItems: "start" }}>
            <div className="f">
              <label htmlFor="tx-e-amount">Monto</label>
              <input id="tx-e-amount" type="number" min="0" inputMode="decimal" value={eAmount} onChange={(e) => setEAmount(e.target.value)}
                className={editTried && !editAmountOk ? "err" : ""} aria-invalid={editTried && !editAmountOk} />
              {editTried && !editAmountOk && <p className="err-msg">Escribe un monto mayor a 0.</p>}
            </div>
            <div className="f">
              <label htmlFor="tx-e-date">Fecha</label>
              <input id="tx-e-date" type="date" value={eDate} onChange={(e) => setEDate(e.target.value)}
                className={editTried && !editDateOk ? "err" : ""} aria-invalid={editTried && !editDateOk} />
              {editTried && !editDateOk && <p className="err-msg">Elige una fecha válida.</p>}
            </div>
          </div>
          <div className="f">
            <label htmlFor="tx-e-cat">Categoría</label>
            <select id="tx-e-cat" value={eCategory} onChange={(e) => setECategory(e.target.value || "Otros")}>
              {(eType === "expense" ? expenseCats : incomeCats).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          {accounts.length > 0 && (
            <div className="f">
              <label htmlFor="tx-e-acc">Cuenta</label>
              <select id="tx-e-acc" value={eAccountId} onChange={(e) => setEAccountId(e.target.value || "none")}>
                <option value="none">Sin cuenta</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
          )}

          <div className="ft">
            {editTried && !editValid && (
              <p role="alert" className="err-msg mr-auto">Revisa los campos marcados.</p>
            )}
            <button type="button" className="btn soft" onClick={() => setEditTx(null)}>Cancelar</button>
            <button type="submit" className="btn"><Check size={16} aria-hidden /> Guardar cambios</button>
          </div>
        </form>
      </Sheet>
    </>
  );
}
