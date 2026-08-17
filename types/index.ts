/** Quién agregó el registro (relevante en cuentas compartidas) */
export interface AddedBy {
    userId: string;
    name: string;
}

export interface FinanceItem {
    id: string;
    label: string;
    amount: number;
    date?: string;
    type: "asset" | "liability" | "bucket";
    category?: string;
    /** Si el gasto se cargó a una tarjeta, su id. Al borrarlo se
     *  descuenta de la deuda de esa tarjeta (significa que ya se pagó). */
    cardId?: string;
    addedBy?: AddedBy;
}

export interface SubscriptionItem {
    id: string;
    label: string;
    amount: number;
    billingCycle: "mensual" | "anual";
    category?: string;
    addedBy?: AddedBy;
}

export interface GoalItem {
    id: string;
    label: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string;      // YYYY-MM-DD
    addedBy?: AddedBy;
}

// ── Ledger de movimientos ────────────────────────────────────────
export interface TransactionItem {
    id: string;
    label: string;
    amount: number;             // siempre positivo; el signo lo da `type`
    date: string;               // YYYY-MM-DD
    type: "expense" | "income";
    category?: string;
    source?: "manual" | "scan" | "fixed"; // scan = escáner de tickets; fixed = gasto fijo automático
    /** Si nació de un gasto fijo, el id de la suscripción (evita duplicados por mes) */
    subId?: string;
    /** Cuenta (item de activos) de la que salió/entró el dinero */
    accountId?: string;
    addedBy?: AddedBy;
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
    addedBy?: AddedBy;
}

// ── Compras a Meses Sin Intereses ────────────────────────────────
export interface InstallmentPlan {
    id: string;
    cardId: string;          // tarjeta donde se hizo la compra
    label: string;           // "Laptop", "Refrigerador"
    totalAmount: number;     // monto total diferido
    months: number;          // plazo: 3, 6, 9, 12, 18, 24
    startDate: string;       // YYYY-MM-DD, fecha de la compra
    addedBy?: AddedBy;
}

// ── Presupuestos mensuales por categoría ─────────────────────────
export interface BudgetItem {
    id: string;
    category: string;
    monthlyLimit: number;
    addedBy?: AddedBy;
}

export interface AppSettings {
    autoSnapshotDays?: number;  // cada cuántos días auto-guardar (default 7)
    demoData?: boolean;         // true mientras están cargados los datos de ejemplo
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
    customExpenseCats?: string[];
    customIncomeCats?: string[];
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
