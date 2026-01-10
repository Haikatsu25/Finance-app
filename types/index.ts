export interface FinanceItem {
    id: string;
    label: string;
    amount: number;
    date?: string;
    type: "asset" | "liability" | "bucket";
    category?: string;
}

export interface FinanceState {
    assets: FinanceItem[];
    liabilities: FinanceItem[];
    buckets: FinanceItem[];
    history: HistorySnapshot[];
}

export interface HistorySnapshot {
    id: string;
    date: string;
    totalAssets: number;
    totalLiabilities: number;
    totalBuckets: number;
    available: number;
    deficit: number;
    assets?: FinanceItem[];
    liabilities?: FinanceItem[];
    buckets?: FinanceItem[];
}
