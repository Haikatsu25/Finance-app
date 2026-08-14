import { TransactionItem, CreditCardItem, SubscriptionItem, InstallmentPlan } from "@/types";

// ─────────────────────────────────────────────────────────────────
// FECHAS DE PAGO DE TARJETAS
// ─────────────────────────────────────────────────────────────────

/** Devuelve la próxima ocurrencia de un día del mes (clampeado a fin de mes). */
export function nextOccurrence(dayOfMonth: number, from: Date = new Date()): Date {
    const clamp = (year: number, month: number, day: number) => {
        const lastDay = new Date(year, month + 1, 0).getDate();
        return new Date(year, month, Math.min(day, lastDay));
    };
    const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    let candidate = clamp(today.getFullYear(), today.getMonth(), dayOfMonth);
    if (candidate < today) {
        candidate = clamp(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
    }
    return candidate;
}

export function daysUntil(date: Date, from: Date = new Date()): number {
    const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
    const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    return Math.round((b - a) / 86_400_000);
}

export interface UpcomingPayment {
    id: string;
    label: string;
    amount: number;         // lo sugerido a pagar
    dueDate: Date;
    daysLeft: number;
    kind: "card" | "subscription";
    urgency: "overdue" | "urgent" | "soon" | "ok"; // <0 | ≤3 | ≤7 | resto
    note?: string;
}

function urgencyOf(daysLeft: number): UpcomingPayment["urgency"] {
    if (daysLeft < 0) return "overdue";
    if (daysLeft <= 3) return "urgent";
    if (daysLeft <= 7) return "soon";
    return "ok";
}

/** Pagos próximos (30 días): fechas límite de tarjetas + fijos mensuales. */
export function upcomingPayments(
    cards: CreditCardItem[],
    subscriptions: SubscriptionItem[],
    horizon = 30,
    installments: InstallmentPlan[] = [],
): UpcomingPayment[] {
    const out: UpcomingPayment[] = [];

    for (const c of cards) {
        // Lo que hay que pagar este corte = contado + mensualidades MSI
        const { dueThisMonth, monthlyInstallment } = cardDebtBreakdown(c, installments);
        if (dueThisMonth <= 0) continue;
        const dueDate = nextOccurrence(c.dueDay);
        const daysLeft = daysUntil(dueDate);
        if (daysLeft > horizon) continue;
        out.push({
            id: `card-${c.id}`,
            label: c.label,
            amount: dueThisMonth,
            dueDate,
            daysLeft,
            kind: "card",
            urgency: urgencyOf(daysLeft),
            note: monthlyInstallment > 0 ? `incluye MSI` : undefined,
        });
    }

    // Los fijos mensuales no tienen día configurado; se muestran como
    // referencia del mes en curso (día 1 del siguiente mes como corte).
    for (const s of subscriptions) {
        if (s.billingCycle !== "mensual") continue;
        const dueDate = nextOccurrence(1);
        const daysLeft = daysUntil(dueDate);
        if (daysLeft > horizon) continue;
        out.push({
            id: `sub-${s.id}`,
            label: s.label,
            amount: s.amount,
            dueDate,
            daysLeft,
            kind: "subscription",
            urgency: urgencyOf(daysLeft),
        });
    }

    return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

// ─────────────────────────────────────────────────────────────────
// MESES SIN INTERESES (MSI)
// Cada compra diferida se paga en `months` mensualidades iguales.
// El saldo pendiente sí ocupa tu línea de crédito, pero NO es deuda
// que debas liquidar este mes: solo la mensualidad en curso.
// ─────────────────────────────────────────────────────────────────

export interface InstallmentStatus {
    plan: InstallmentPlan;
    monthlyPayment: number;
    monthsPaid: number;
    monthsLeft: number;
    paidAmount: number;
    remainingAmount: number;
    nextChargeDate: Date | null;
    progress: number;        // 0–100
    done: boolean;
}

/** Meses completos transcurridos entre dos fechas. */
function fullMonthsBetween(start: Date, end: Date): number {
    let m = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    if (end.getDate() < start.getDate()) m -= 1;
    return Math.max(0, m);
}

function addMonths(date: Date, n: number): Date {
    const d = new Date(date.getFullYear(), date.getMonth() + n, 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return new Date(d.getFullYear(), d.getMonth(), Math.min(date.getDate(), lastDay));
}

export function installmentStatus(plan: InstallmentPlan, from: Date = new Date()): InstallmentStatus {
    const months = Math.max(1, plan.months || 1);
    const monthlyPayment = Math.round((plan.totalAmount / months) * 100) / 100;
    const start = new Date(plan.startDate + "T12:00:00");
    const elapsed = isNaN(start.getTime()) ? 0 : fullMonthsBetween(start, from);
    const monthsPaid = Math.min(months, elapsed);
    const monthsLeft = months - monthsPaid;
    const paidAmount = Math.round(monthlyPayment * monthsPaid * 100) / 100;
    const remainingAmount = Math.round((plan.totalAmount - paidAmount) * 100) / 100;

    return {
        plan,
        monthlyPayment,
        monthsPaid,
        monthsLeft,
        paidAmount,
        remainingAmount: Math.max(0, remainingAmount),
        nextChargeDate: monthsLeft > 0 && !isNaN(start.getTime()) ? addMonths(start, monthsPaid + 1) : null,
        progress: Math.min(100, (monthsPaid / months) * 100),
        done: monthsLeft <= 0,
    };
}

export interface CardDebtBreakdown {
    cash: number;                 // deuda de contado (a liquidar este corte)
    installmentRemaining: number; // saldo pendiente a meses
    monthlyInstallment: number;   // suma de mensualidades activas
    totalOwed: number;            // contado + saldo a meses
    dueThisMonth: number;         // contado + mensualidades de este mes
    activePlans: InstallmentStatus[];
}

export function cardDebtBreakdown(
    card: CreditCardItem,
    installments: InstallmentPlan[],
    from: Date = new Date(),
): CardDebtBreakdown {
    const statuses = installments
        .filter((p) => p.cardId === card.id)
        .map((p) => installmentStatus(p, from));
    const active = statuses.filter((s) => !s.done);

    const installmentRemaining = Math.round(active.reduce((s, i) => s + i.remainingAmount, 0) * 100) / 100;
    const monthlyInstallment = Math.round(active.reduce((s, i) => s + i.monthlyPayment, 0) * 100) / 100;
    const cash = card.balance || 0;

    return {
        cash,
        installmentRemaining,
        monthlyInstallment,
        totalOwed: Math.round((cash + installmentRemaining) * 100) / 100,
        dueThisMonth: Math.round((cash + monthlyInstallment) * 100) / 100,
        activePlans: active.sort((a, b) => a.monthsLeft - b.monthsLeft),
    };
}

/** Totales globales de todas las tarjetas. */
export function totalDebtBreakdown(cards: CreditCardItem[], installments: InstallmentPlan[], from: Date = new Date()) {
    let cash = 0, installmentRemaining = 0, monthlyInstallment = 0;
    for (const c of cards) {
        const b = cardDebtBreakdown(c, installments, from);
        cash += b.cash;
        installmentRemaining += b.installmentRemaining;
        monthlyInstallment += b.monthlyInstallment;
    }
    const r2 = (n: number) => Math.round(n * 100) / 100;
    return {
        cash: r2(cash),
        installmentRemaining: r2(installmentRemaining),
        monthlyInstallment: r2(monthlyInstallment),
        totalOwed: r2(cash + installmentRemaining),
        dueThisMonth: r2(cash + monthlyInstallment),
    };
}

// ─────────────────────────────────────────────────────────────────
// ¿EN QUÉ TARJETA ME CONVIENE COMPRAR?
// La compra de hoy cae en el estado de cuenta que cierra en el
// PRÓXIMO corte; se paga en la fecha límite POSTERIOR a ese corte.
// Más días de financiamiento = mejor (dinero gratis más tiempo).
// ─────────────────────────────────────────────────────────────────

export interface CardRecommendation {
    card: CreditCardItem;
    statementClose: Date;    // corte donde cae la compra de hoy
    dueDate: Date;           // cuándo se paga realmente
    floatDays: number;       // días de financiamiento sin intereses
    availableCredit: number; // límite − deuda actual
    fits: boolean;           // ¿alcanza el crédito para el monto?
}

export function bestCardFor(
    amount: number,
    cards: CreditCardItem[],
    installments: InstallmentPlan[] = [],
    from: Date = new Date(),
): CardRecommendation[] {
    const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());

    const recs = cards.map((card) => {
        // Corte donde cae una compra hecha HOY (si hoy es el corte, la
        // compra normalmente entra al siguiente ciclo: usamos > hoy)
        const clamp = (y: number, m: number, d: number) => {
            const last = new Date(y, m + 1, 0).getDate();
            return new Date(y, m, Math.min(d, last));
        };
        let statementClose = clamp(today.getFullYear(), today.getMonth(), card.cutoffDay);
        if (statementClose <= today) {
            statementClose = clamp(today.getFullYear(), today.getMonth() + 1, card.cutoffDay);
        }
        // Fecha límite de pago posterior al corte
        let dueDate = clamp(statementClose.getFullYear(), statementClose.getMonth(), card.dueDay);
        if (dueDate <= statementClose) {
            dueDate = clamp(statementClose.getFullYear(), statementClose.getMonth() + 1, card.dueDay);
        }
        const floatDays = daysUntil(dueDate, today);
        // El saldo pendiente a meses TAMBIÉN ocupa la línea de crédito
        const { totalOwed } = cardDebtBreakdown(card, installments, today);
        const availableCredit = Math.max(0, (card.creditLimit || 0) - totalOwed);
        const fits = card.creditLimit > 0 ? availableCredit >= amount : true;
        return { card, statementClose, dueDate, floatDays, availableCredit, fits };
    });

    // Las que sí alcanzan primero, ordenadas por más días de financiamiento
    return recs.sort((a, b) => (Number(b.fits) - Number(a.fits)) || (b.floatDays - a.floatDays));
}

// ─────────────────────────────────────────────────────────────────
// SIMULADOR DE DEUDAS — amortización con pago fijo mensual
// ─────────────────────────────────────────────────────────────────

export interface AmortizationResult {
    months: number;              // meses para liquidar (Infinity si no alcanza)
    totalPaid: number;
    totalInterest: number;
    schedule: { month: number; balance: number }[];
    minViablePayment: number;    // interés del primer mes (pagar más que esto)
}

export function amortize(balance: number, aprPct: number, monthlyPayment: number): AmortizationResult {
    const r = aprPct / 100 / 12;
    const minViablePayment = balance * r;
    const schedule: { month: number; balance: number }[] = [{ month: 0, balance }];

    if (balance <= 0) {
        return { months: 0, totalPaid: 0, totalInterest: 0, schedule, minViablePayment: 0 };
    }
    if (monthlyPayment <= minViablePayment) {
        return { months: Infinity, totalPaid: Infinity, totalInterest: Infinity, schedule, minViablePayment };
    }

    let b = balance;
    let months = 0;
    let totalPaid = 0;
    const MAX_MONTHS = 600; // 50 años, tope de seguridad

    while (b > 0.005 && months < MAX_MONTHS) {
        months += 1;
        const interest = b * r;
        const principal = Math.min(b, monthlyPayment - interest);
        const paid = principal + interest;
        b -= principal;
        totalPaid += paid;
        schedule.push({ month: months, balance: Math.max(0, Math.round(b * 100) / 100) });
    }

    return {
        months,
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalInterest: Math.round((totalPaid - balance) * 100) / 100,
        schedule,
        minViablePayment: Math.round(minViablePayment * 100) / 100,
    };
}

// ─────────────────────────────────────────────────────────────────
// RESÚMENES MENSUALES DEL LEDGER
// ─────────────────────────────────────────────────────────────────

export function monthKey(date: string | Date): string {
    const d = typeof date === "string" ? new Date(date + (date.length === 10 ? "T12:00:00" : "")) : date;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonth(key: string, delta: number): string {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return monthKey(d);
}

export function monthLabel(key: string): string {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

export interface MonthSummary {
    key: string;
    income: number;
    expense: number;
    net: number;
    byCategory: { category: string; amount: number }[];  // solo gastos, desc
    topCategory: { category: string; amount: number } | null;
    biggestExpense: TransactionItem | null;
    count: number;
}

export function summarizeMonth(transactions: TransactionItem[], key: string): MonthSummary {
    const inMonth = transactions.filter((t) => monthKey(t.date) === key);
    let income = 0;
    let expense = 0;
    const cat = new Map<string, number>();
    let biggest: TransactionItem | null = null;

    for (const t of inMonth) {
        if (t.type === "income") {
            income += t.amount;
        } else {
            expense += t.amount;
            const c = t.category || "Sin categoría";
            cat.set(c, (cat.get(c) || 0) + t.amount);
            if (!biggest || t.amount > biggest.amount) biggest = t;
        }
    }

    const byCategory = Array.from(cat, ([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

    return {
        key,
        income: Math.round(income * 100) / 100,
        expense: Math.round(expense * 100) / 100,
        net: Math.round((income - expense) * 100) / 100,
        byCategory,
        topCategory: byCategory[0] || null,
        biggestExpense: biggest,
        count: inMonth.length,
    };
}

/** Gasto del mes actual por categoría (para presupuestos). */
export function spentByCategory(transactions: TransactionItem[], key: string): Map<string, number> {
    const map = new Map<string, number>();
    for (const t of transactions) {
        if (t.type !== "expense" || monthKey(t.date) !== key) continue;
        const c = t.category || "Sin categoría";
        map.set(c, (map.get(c) || 0) + t.amount);
    }
    return map;
}
