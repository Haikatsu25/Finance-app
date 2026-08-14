import { Schema, model, models } from 'mongoose';

const FinanceItemSchema = new Schema({
    id: String,
    label: String,
    amount: Number,
    date: String,
    type: String,
    category: String
}, { _id: false });

const SubscriptionItemSchema = new Schema({
    id: String,
    label: String,
    amount: Number,
    billingCycle: String,
    category: String
}, { _id: false });

const GoalItemSchema = new Schema({
    id: String,
    label: String,
    targetAmount: Number,
    currentAmount: Number,
    deadline: String
}, { _id: false });

const TransactionItemSchema = new Schema({
    id: String,
    label: String,
    amount: Number,
    date: String,
    type: String,       // expense | income
    category: String,
    source: String,     // manual | scan
}, { _id: false });

const CreditCardItemSchema = new Schema({
    id: String,
    label: String,
    balance: Number,
    creditLimit: Number,
    cutoffDay: Number,
    dueDay: Number,
    apr: Number,
    minPayment: Number,
}, { _id: false });

const BudgetItemSchema = new Schema({
    id: String,
    category: String,
    monthlyLimit: Number,
}, { _id: false });

const PushSubscriptionSchema = new Schema({
    endpoint: String,
    keys: {
        p256dh: String,
        auth: String,
    },
    createdAt: String,
}, { _id: false });

const HistorySnapshotSchema = new Schema({
    id: String,
    date: String,
    totalAssets: Number,
    totalLiabilities: Number,
    totalBuckets: Number,
    totalFixedCosts: Number,
    available: Number,
    deficit: Number,
    auto: Boolean,
    assets: [FinanceItemSchema],
    liabilities: [FinanceItemSchema],
    buckets: [FinanceItemSchema],
    subscriptions: [SubscriptionItemSchema],
    goals: [GoalItemSchema],
}, { _id: false });

const FinanceSchema = new Schema({
    userId: { type: String, required: true, unique: true, index: true },
    // Optimistic concurrency: increments on every save. A stale client
    // (another open tab/device) is rejected with 409 instead of silently
    // overwriting newer data.
    rev: { type: Number, default: 0 },
    assets: [FinanceItemSchema],
    liabilities: [FinanceItemSchema],
    buckets: [FinanceItemSchema],
    subscriptions: [SubscriptionItemSchema],
    goals: [GoalItemSchema],
    transactions: [TransactionItemSchema],
    creditCards: [CreditCardItemSchema],
    budgets: [BudgetItemSchema],
    settings: {
        autoSnapshotDays: { type: Number, default: 7 },
    },
    // Suscripciones de notificaciones push (una por dispositivo/navegador).
    // NO viaja por el POST general de /api/finance: se maneja aparte.
    pushSubscriptions: [PushSubscriptionSchema],
    history: [HistorySnapshotSchema],
}, { timestamps: true });

const Finance = models.Finance || model('Finance', FinanceSchema);

export default Finance;
