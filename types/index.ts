export interface FinanceItem {
    id: string;
    label: string;
    amount: number;
    date?: string; // ISO date string YYYY-MM-DD
    type: 'income' | 'expense' | 'asset' | 'liability' | 'bucket';
}

export interface FinanceState {
    assets: FinanceItem[];     // Current money (e.g., NU)
    liabilities: FinanceItem[]; // Debts/Payments (e.g., 31/12/25 payment)
    buckets: FinanceItem[];    // Reserved money (e.g., Personal)
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
}
