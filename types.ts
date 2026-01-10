export interface FinanceItem {
    id: string;
    label: string;
    amount: number;
    date?: string;
    type: "asset" | "liability" | "bucket";
    category?: string;
}

export interface HistorySnapshot {
    id: string;
    date: string;
    totalAssets: number;
    totalLiabilities: number;
    totalBuckets: number;
    available: number;
    deficit: number;
}
