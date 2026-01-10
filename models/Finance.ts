import mongoose, { Schema, model, models } from 'mongoose';

const FinanceItemSchema = new Schema({
    id: String,
    label: String,
    amount: Number,
    date: String,
    type: String,
    category: String
});

const HistorySnapshotSchema = new Schema({
    id: String,
    date: String,
    totalAssets: Number,
    totalLiabilities: Number,
    totalBuckets: Number,
    available: Number,
    deficit: Number,
});

const FinanceSchema = new Schema({
    userId: { type: String, required: true, unique: true, default: 'default_user' }, // Simple Singleton for now
    assets: [FinanceItemSchema],
    liabilities: [FinanceItemSchema],
    buckets: [FinanceItemSchema],
    history: [HistorySnapshotSchema],
}, { timestamps: true });

const Finance = models.Finance || model('Finance', FinanceSchema);

export default Finance;
