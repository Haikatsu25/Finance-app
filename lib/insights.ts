// Motor de insights y score de salud financiera — 100% local y determinista.
// Reglas explicables: cada punto que suma o resta tiene una razón visible.

import {
    FinanceItem, SubscriptionItem, GoalItem, TransactionItem,
    CreditCardItem, InstallmentPlan, BudgetItem,
} from "@/types";
import {
    cardDebtBreakdown, nextOccurrence, daysUntil,
    monthKey, shiftMonth, summarizeMonth, spentByCategory,
} from "@/lib/finance-utils";

export interface FinanceData {
    assets: FinanceItem[];
    liabilities: FinanceItem[];
    buckets: FinanceItem[];
    subscriptions: SubscriptionItem[];
    goals: GoalItem[];
    transactions: TransactionItem[];
    creditCards: CreditCardItem[];
    installments: InstallmentPlan[];
    budgets: BudgetItem[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = (arr: { amount: number }[]) => arr.reduce((s, i) => s + (i.amount || 0), 0);

// ─────────────────────────────────────────────────────────────────
// SCORE DE SALUD FINANCIERA (0–100, explicable)
// ─────────────────────────────────────────────────────────────────

export interface HealthFactor {
    label: string;
    points: number;      // negativo = resta
    detail: string;
}

export interface HealthScore {
    score: number;
    label: string;
    tone: "emerald" | "lime" | "amber" | "rose";
    factors: HealthFactor[];
}

export function computeHealthScore(d: FinanceData): HealthScore {
    const factors: HealthFactor[] = [];
    let score = 100;

    const totalAssets = sum(d.assets);
    const totalLiabilities = sum(d.liabilities);
    const totalBuckets = sum(d.buckets);
    const fixedMonthly = d.subscriptions.reduce(
        (s, i) => s + (i.billingCycle === "anual" ? i.amount / 12 : i.amount), 0);

    let totalOwed = 0, totalLimit = 0, msiMonthly = 0;
    for (const c of d.creditCards) {
        const bd = cardDebtBreakdown(c, d.installments);
        totalOwed += bd.totalOwed;
        totalLimit += c.creditLimit || 0;
        msiMonthly += bd.monthlyInstallment;
    }

    // 1) Utilización de crédito
    if (totalLimit > 0) {
        const util = (totalOwed / totalLimit) * 100;
        if (util >= 90) { score -= 25; factors.push({ label: "Utilización de crédito", points: -25, detail: `Usas el ${util.toFixed(0)}% de tu límite — muy alto` }); }
        else if (util >= 70) { score -= 15; factors.push({ label: "Utilización de crédito", points: -15, detail: `Usas el ${util.toFixed(0)}% de tu límite` }); }
        else if (util >= 40) { score -= 6; factors.push({ label: "Utilización de crédito", points: -6, detail: `Usas el ${util.toFixed(0)}% de tu límite` }); }
        else factors.push({ label: "Utilización de crédito", points: 0, detail: `Solo el ${util.toFixed(0)}% — saludable` });
    }

    // 2) Deuda vs activos
    if (totalAssets > 0) {
        const ratio = (totalLiabilities + totalOwed) / totalAssets;
        if (ratio >= 1) { score -= 25; factors.push({ label: "Deuda vs activos", points: -25, detail: "Debes más de lo que tienes" }); }
        else if (ratio >= 0.6) { score -= 14; factors.push({ label: "Deuda vs activos", points: -14, detail: `Tu deuda es el ${(ratio * 100).toFixed(0)}% de tus activos` }); }
        else if (ratio >= 0.3) { score -= 6; factors.push({ label: "Deuda vs activos", points: -6, detail: `Tu deuda es el ${(ratio * 100).toFixed(0)}% de tus activos` }); }
        else factors.push({ label: "Deuda vs activos", points: 0, detail: `Solo el ${(ratio * 100).toFixed(0)}% — bien controlada` });
    }

    // 3) Disponible real del mes
    const available = totalAssets - totalLiabilities - totalBuckets;
    const afterMonth = available - fixedMonthly - msiMonthly;
    if (afterMonth < 0) { score -= 20; factors.push({ label: "Disponible del mes", points: -20, detail: "Tus compromisos del mes superan tu disponible" }); }
    else factors.push({ label: "Disponible del mes", points: 0, detail: "Cubres tus compromisos del mes" });

    // 4) Fondo de emergencia (apartados de categoría Emergencia)
    const monthlyBurn = fixedMonthly + msiMonthly;
    if (monthlyBurn > 0) {
        const emergency = sum(d.buckets.filter((b) => /emergencia/i.test(b.category || "")));
        const months = emergency / monthlyBurn;
        if (months >= 3) factors.push({ label: "Fondo de emergencia", points: 0, detail: `Cubres ${months.toFixed(1)} meses de gastos fijos` });
        else if (months >= 1) { score -= 5; factors.push({ label: "Fondo de emergencia", points: -5, detail: `Solo cubre ${months.toFixed(1)} meses — la meta son 3` }); }
        else { score -= 10; factors.push({ label: "Fondo de emergencia", points: -10, detail: "Sin colchón para imprevistos" }); }
    }

    // 5) Presupuestos
    if (d.budgets.length > 0) {
        const spent = spentByCategory(d.transactions, monthKey(new Date()));
        const over = d.budgets.filter((b) => (spent.get(b.category) || 0) > b.monthlyLimit).length;
        if (over > 0) { const p = Math.min(15, over * 5); score -= p; factors.push({ label: "Presupuestos", points: -p, detail: `${over} presupuesto${over > 1 ? "s" : ""} excedido${over > 1 ? "s" : ""} este mes` }); }
        else factors.push({ label: "Presupuestos", points: 0, detail: "Todos dentro del límite" });
    }

    // 6) Pagos vencidos
    const overdue = d.creditCards.filter((c) => {
        const bd = cardDebtBreakdown(c, d.installments);
        return bd.dueThisMonth > 0 && daysUntil(nextOccurrence(c.dueDay)) < 0;
    }).length;
    if (overdue > 0) { score -= 15; factors.push({ label: "Pagos vencidos", points: -15, detail: `${overdue} tarjeta${overdue > 1 ? "s" : ""} con pago vencido` }); }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const [label, tone]: [string, HealthScore["tone"]] =
        score >= 80 ? ["Excelente", "emerald"]
        : score >= 60 ? ["Bien", "lime"]
        : score >= 40 ? ["Regular", "amber"]
        : ["En riesgo", "rose"];

    return { score, label, tone, factors };
}

// ─────────────────────────────────────────────────────────────────
// INSIGHTS AUTOMÁTICOS — hallazgos accionables ordenados por urgencia
// ─────────────────────────────────────────────────────────────────

export type InsightSeverity = "alert" | "warn" | "tip" | "good";
export type InsightIcon = "pay" | "card" | "budget" | "trend" | "msi" | "goal" | "fund" | "cut";

export interface Insight {
    id: string;
    severity: InsightSeverity;
    icon: InsightIcon;
    title: string;
    detail: string;
}

const money0 = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

export function computeInsights(d: FinanceData): Insight[] {
    const out: Insight[] = [];
    const now = new Date();
    const thisMonth = monthKey(now);

    // Pagos de tarjeta próximos o vencidos
    for (const c of d.creditCards) {
        const bd = cardDebtBreakdown(c, d.installments);
        if (bd.dueThisMonth <= 0) continue;
        const days = daysUntil(nextOccurrence(c.dueDay));
        if (days < 0) out.push({ id: `over-${c.id}`, severity: "alert", icon: "pay", title: `${c.label}: pago VENCIDO`, detail: `Debiste pagar ${money0(bd.dueThisMonth)} hace ${Math.abs(days)} día${Math.abs(days) > 1 ? "s" : ""} — ya puede estar generando intereses.` });
        else if (days <= 3) out.push({ id: `due-${c.id}`, severity: "alert", icon: "pay", title: `${c.label}: pagas en ${days === 0 ? "HOY" : `${days} día${days > 1 ? "s" : ""}`}`, detail: `Paga ${money0(bd.dueThisMonth)} para no generar intereses.` });
    }

    // Utilización por tarjeta
    for (const c of d.creditCards) {
        if (!c.creditLimit) continue;
        const bd = cardDebtBreakdown(c, d.installments);
        const util = (bd.totalOwed / c.creditLimit) * 100;
        if (util >= 80) out.push({ id: `util-${c.id}`, severity: "warn", icon: "card", title: `${c.label} al ${util.toFixed(0)}% del límite`, detail: `Solo te quedan ${money0(Math.max(0, c.creditLimit - bd.totalOwed))}. Arriba del 30% afecta tu score en buró.` });
    }

    // MSI: último pago cerca
    for (const c of d.creditCards) {
        const bd = cardDebtBreakdown(c, d.installments);
        for (const s of bd.activePlans) {
            if (s.monthsLeft === 1) out.push({ id: `msi-${s.plan.id}`, severity: "good", icon: "msi", title: `¡Último pago de "${s.plan.label}"!`, detail: `Después de este mes se liberan ${money0(s.monthlyPayment)} mensuales de tu flujo.` });
        }
    }

    // Presupuestos
    if (d.budgets.length) {
        const spent = spentByCategory(d.transactions, thisMonth);
        for (const b of d.budgets) {
            const used = spent.get(b.category) || 0;
            const pct = b.monthlyLimit > 0 ? (used / b.monthlyLimit) * 100 : 0;
            if (pct >= 100) out.push({ id: `bover-${b.id}`, severity: "alert", icon: "budget", title: `Presupuesto de ${b.category} excedido`, detail: `Llevas ${money0(used)} de ${money0(b.monthlyLimit)} (${pct.toFixed(0)}%).` });
            else if (pct >= 80) out.push({ id: `bwarn-${b.id}`, severity: "warn", icon: "budget", title: `${b.category} al ${pct.toFixed(0)}%`, detail: `Te quedan ${money0(b.monthlyLimit - used)} para lo que resta del mes.` });
        }
    }

    // Tendencia de gasto vs mes anterior
    const cur = summarizeMonth(d.transactions, thisMonth);
    const prev = summarizeMonth(d.transactions, shiftMonth(thisMonth, -1));
    if (prev.expense > 0 && cur.count > 0) {
        const delta = ((cur.expense - prev.expense) / prev.expense) * 100;
        if (delta >= 25) out.push({ id: "trend-up", severity: "warn", icon: "trend", title: `Gastas ${delta.toFixed(0)}% más que el mes pasado`, detail: `${money0(cur.expense)} vs ${money0(prev.expense)}. Tu categoría top: ${cur.topCategory?.category || "—"}.` });
        else if (delta <= -15) out.push({ id: "trend-down", severity: "good", icon: "trend", title: `Gastas ${Math.abs(delta).toFixed(0)}% menos que el mes pasado`, detail: `${money0(cur.expense)} vs ${money0(prev.expense)}. ¡Sigue así!` });
    }

    // Fondo de emergencia
    const fixedMonthly = d.subscriptions.reduce((s, i) => s + (i.billingCycle === "anual" ? i.amount / 12 : i.amount), 0);
    let msiMonthly = 0;
    for (const c of d.creditCards) msiMonthly += cardDebtBreakdown(c, d.installments).monthlyInstallment;
    const burn = fixedMonthly + msiMonthly;
    if (burn > 0) {
        const emergency = sum(d.buckets.filter((b) => /emergencia/i.test(b.category || "")));
        if (emergency < burn * 3) out.push({ id: "fund", severity: "tip", icon: "fund", title: "Tu fondo de emergencia está corto", detail: `Con tus compromisos de ${money0(burn)}/mes, la meta de 3 meses es ${money0(burn * 3)}. Llevas ${money0(emergency)}.` });
    }

    // Metas: ritmo necesario
    for (const g of d.goals) {
        const remaining = g.targetAmount - g.currentAmount;
        if (remaining <= 0) continue;
        const deadline = new Date(g.deadline + "T12:00:00");
        if (isNaN(deadline.getTime())) continue;
        const monthsLeft = Math.max(1, (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth()));
        const perMonth = remaining / monthsLeft;
        out.push({ id: `goal-${g.id}`, severity: "tip", icon: "goal", title: `"${g.label}": aparta ${money0(perMonth)}/mes`, detail: `Te faltan ${money0(remaining)} y quedan ${monthsLeft} mes${monthsLeft > 1 ? "es" : ""} para tu fecha.` });
    }

    // Corte próximo — tip de financiamiento
    for (const c of d.creditCards) {
        const days = daysUntil(nextOccurrence(c.cutoffDay));
        if (days >= 0 && days <= 2) out.push({ id: `cut-${c.id}`, severity: "tip", icon: "cut", title: `${c.label} corta ${days === 0 ? "hoy" : `en ${days} día${days > 1 ? "s" : ""}`}`, detail: "Si una compra puede esperar al día siguiente del corte, ganas casi un mes extra sin intereses." });
    }

    const order: Record<InsightSeverity, number> = { alert: 0, warn: 1, tip: 2, good: 3 };
    return out.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 8);
}
