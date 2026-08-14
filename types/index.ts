export interface FinanceItem {
    id: string;
    label: string;
    amount: number;
    date?: string;
    type: "asset" | "liability" | "bucket";
    category?: string;
}

export interface SubscriptionItem {
    id: string;
    label: string;
    amount: number;
    billingCycle: "mensual" | "anual";
    category?: string;
}

export interface GoalItem {
    id: string;
    label: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string;      // YYYY-MM-DD
}

// ── Ledger de movimientos ────────────────────────────────────────
export interface TransactionItem {
    id: string;
    label: string;
    amount: number;             // siempre positivo; el signo lo da `type`
    date: string;               // YYYY-MM-DD
    type: "expense" | "income";
    category?: string;
    source?: "manual" | "scan"; // scan = capturado con el escáner de tickets
}

// ── Tarjetas de crédito ──────────────────────────────────────────
export interface CreditCardItem {
    id: string;
    label: string;              // "BBVA Azul", "Nu"
    balance: number;            // deuda actual
    creditLimit: number;
    cutoffDay: number;          // día del mes (1-31)
    dueDay: number;             // día del mes (1-31)
    apr?: number;               // tasa anual %, para el simulador
    minPayment?: number;
}

// ── Compras a Meses Sin Intereses ────────────────────────────────
export interface InstallmentPlan {
    id: string;
    cardId: string;          // tarjeta donde se hizo la compra
    label: string;           // "Laptop", "Refrigerador"
    totalAmount: number;     // monto total diferido
    months: number;          // plazo: 3, 6, 9, 12, 18, 24
    startDate: string;       // YYYY-MM-DD, fecha de la compra
}

// ── Presupuestos mensuales por categoría ─────────────────────────
export interface BudgetItem {
    id: string;
    category: string;
    monthlyLimit: number;
}

export interface AppSettings {
    autoSnapshotDays?: number;  // cada cuántos días auto-guardar (default 7)
}

export interface FinanceState {
    assets: FinanceItem[];
    liabilities: FinanceItem[];
    buckets: FinanceItem[];
    subscriptions: SubscriptionItem[];
    goals: GoalItem[];
    transactions: TransactionItem[];
    creditCards: CreditCardItem[];
    installments: InstallmentPlan[];
    budgets: BudgetItem[];
    history: HistorySnapshot[];
    settings?: AppSettings;
}

export interface HistorySnapshot {
    id: string;
    date: string;
    totalAssets: number;
    totalLiabilities: number;
    totalBuckets: number;
    totalFixedCosts?: number;
    available: number;
    deficit: number;
    auto?: boolean;             // true si lo guardó el auto-snapshot semanal
    assets?: FinanceItem[];
    liabilities?: FinanceItem[];
    buckets?: FinanceItem[];
    subscriptions?: SubscriptionItem[];
    goals?: GoalItem[];
}
