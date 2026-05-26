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
    currentAmount: number; // can be manually tracked or linked conceptually
    deadline: string;      // YYYY-MM-DD
}

export interface FinanceState {
    assets: FinanceItem[];
    liabilities: FinanceItem[];
    buckets: FinanceItem[];
    subscriptions: SubscriptionItem[];
    goals: GoalItem[];
    history: HistorySnapshot[];
}

export interface HistorySnapshot {
    id: string;
    date: string;
    totalAssets: number;
    totalLiabilities: number;
    totalBuckets: number;
    totalFixedCosts?: number; // Added for tracking fixed costs history
    available: number;
    deficit: number;
    assets?: FinanceItem[];
    liabilities?: FinanceItem[];
    buckets?: FinanceItem[];
    subscriptions?: SubscriptionItem[];
    goals?: GoalItem[];
}
