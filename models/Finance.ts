import mongoose, { Schema, model, models } from 'mongoose';

const FinanceItemSchema = new Schema({
    id: String,
    label: String,
    amount: Number,
    date: String,
    type: String,
    category: String
});

const SubscriptionItemSchema = new Schema({
    id: String,
    label: String,
    amount: Number,
    billingCycle: String,
    category: String
});

const GoalItemSchema = new Schema({
    id: String,
    label: String,
    targetAmount: Number,
    currentAmount: Number,
    deadline: String
});

const HistorySnapshotSchema = new Schema({
    id: String,
    date: String,
    totalAssets: Number,
    totalLiabilities: Number,
    totalBuckets: Number,
    available: Number,
    deficit: Number,
    assets: [FinanceItemSchema],
    liabilities: [FinanceItemSchema],
    buckets: [FinanceItemSchema],
    subscriptions: [SubscriptionItemSchema],
    goals: [GoalItemSchema],
});

const FinanceSchema = new Schema({
    userId: { type: String, required: true, unique: true, default: 'default_user' }, // Simple Singleton for now
    assets: [FinanceItemSchema],
    liabilities: [FinanceItemSchema],
    buckets: [FinanceItemSchema],
    subscriptions: [SubscriptionItemSchema],
    goals: [GoalItemSchema],
    history: [HistorySnapshotSchema],
}, { timestamps: true });

const Finance = models.Finance || model('Finance', FinanceSchema);

export default Finance;
