import { TransactionItem, CreditCardItem, SubscriptionItem } from "@/types";

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
): UpcomingPayment[] {
    const out: UpcomingPayment[] = [];

    for (const c of cards) {
        if (c.balance <= 0) continue;
        const dueDate = nextOccurrence(c.dueDay);
        const daysLeft = daysUntil(dueDate);
        if (daysLeft > horizon) continue;
        out.push({
            id: `card-${c.id}`,
            label: c.label,
            amount: c.balance,
            dueDate,
            daysLeft,
            kind: "card",
            urgency: urgencyOf(daysLeft),
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
