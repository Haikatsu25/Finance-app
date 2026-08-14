import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Finance from '@/models/Finance';
import { auth } from '@clerk/nextjs/server';

// ─────────────────────────────────────────────────────────────────────────────
// Server-side validation & sanitization.
// Nothing from the client is trusted: every item is rebuilt field by field,
// amounts are clamped to sane finite numbers, strings are trimmed and capped,
// and array sizes are limited so a hostile payload can't blow up the document.
// ─────────────────────────────────────────────────────────────────────────────

const MAX_ITEMS = 500;
const MAX_HISTORY = 400;
const MAX_LABEL = 120;
const MAX_AMOUNT = 1_000_000_000_000; // $1 billón — más que suficiente

function cleanString(v: unknown, max = MAX_LABEL): string {
    if (typeof v !== 'string') return '';
    return v.trim().slice(0, max);
}

function cleanAmount(v: unknown, allowNegative = false): number {
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    if (!Number.isFinite(n)) return 0;
    const clamped = Math.max(allowNegative ? -MAX_AMOUNT : 0, Math.min(MAX_AMOUNT, n));
    // Guardar con 2 decimales exactos evita acumulación de basura de punto flotante
    return Math.round(clamped * 100) / 100;
}

function cleanId(v: unknown): string {
    const s = cleanString(v, 64);
    return s || crypto.randomUUID();
}

function cleanDate(v: unknown): string {
    const s = cleanString(v, 40);
    // Acepta YYYY-MM-DD o ISO completo; cualquier otra cosa se descarta
    if (/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(s) && !isNaN(Date.parse(s))) return s;
    return '';
}

const ITEM_TYPES = new Set(['asset', 'liability', 'bucket']);
const CYCLES = new Set(['mensual', 'anual']);

/** Autoría del registro (control en cuentas compartidas) */
function cleanAddedBy(v: unknown): { addedBy?: { userId: string; name: string } } {
    if (!v || typeof v !== 'object') return {};
    const userId = cleanString((v as any).userId, 64);
    const name = cleanString((v as any).name, 80);
    if (!userId || !name) return {};
    return { addedBy: { userId, name } };
}

function cleanFinanceItems(v: unknown, fallbackType: string): any[] {
    if (!Array.isArray(v)) return [];
    return v.slice(0, MAX_ITEMS).flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return [];
        const label = cleanString((raw as any).label);
        if (!label) return [];
        const type = ITEM_TYPES.has((raw as any).type) ? (raw as any).type : fallbackType;
        return [{
            id: cleanId((raw as any).id),
            label,
            amount: cleanAmount((raw as any).amount),
            date: cleanDate((raw as any).date),
            type,
            category: cleanString((raw as any).category, 60),
            cardId: cleanString((raw as any).cardId, 64),
            ...cleanAddedBy((raw as any).addedBy),
        }];
    });
}

function cleanSubscriptions(v: unknown): any[] {
    if (!Array.isArray(v)) return [];
    return v.slice(0, MAX_ITEMS).flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return [];
        const label = cleanString((raw as any).label);
        if (!label) return [];
        return [{
            id: cleanId((raw as any).id),
            label,
            amount: cleanAmount((raw as any).amount),
            billingCycle: CYCLES.has((raw as any).billingCycle) ? (raw as any).billingCycle : 'mensual',
            category: cleanString((raw as any).category, 60),
            ...cleanAddedBy((raw as any).addedBy),
        }];
    });
}

function cleanGoals(v: unknown): any[] {
    if (!Array.isArray(v)) return [];
    return v.slice(0, MAX_ITEMS).flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return [];
        const label = cleanString((raw as any).label);
        if (!label) return [];
        return [{
            id: cleanId((raw as any).id),
            label,
            targetAmount: cleanAmount((raw as any).targetAmount),
            currentAmount: cleanAmount((raw as any).currentAmount),
            deadline: cleanDate((raw as any).deadline),
            ...cleanAddedBy((raw as any).addedBy),
        }];
    });
}

const TX_TYPES = new Set(['expense', 'income']);
const TX_SOURCES = new Set(['manual', 'scan']);
const MAX_TRANSACTIONS = 5000;

function cleanTransactions(v: unknown): any[] {
    if (!Array.isArray(v)) return [];
    return v.slice(0, MAX_TRANSACTIONS).flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return [];
        const r = raw as any;
        const label = cleanString(r.label);
        const date = cleanDate(r.date);
        if (!label || !date) return [];
        return [{
            id: cleanId(r.id),
            label,
            amount: cleanAmount(r.amount),
            date,
            type: TX_TYPES.has(r.type) ? r.type : 'expense',
            category: cleanString(r.category, 60),
            source: TX_SOURCES.has(r.source) ? r.source : 'manual',
            ...cleanAddedBy(r.addedBy),
        }];
    });
}

function cleanDay(v: unknown): number {
    const n = typeof v === 'number' ? v : parseInt(String(v), 10);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(31, Math.round(n)));
}

function cleanCreditCards(v: unknown): any[] {
    if (!Array.isArray(v)) return [];
    return v.slice(0, 50).flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return [];
        const r = raw as any;
        const label = cleanString(r.label);
        if (!label) return [];
        return [{
            id: cleanId(r.id),
            label,
            balance: cleanAmount(r.balance),
            creditLimit: cleanAmount(r.creditLimit),
            cutoffDay: cleanDay(r.cutoffDay),
            dueDay: cleanDay(r.dueDay),
            apr: Math.max(0, Math.min(200, cleanAmount(r.apr))),
            minPayment: cleanAmount(r.minPayment),
            ...cleanAddedBy(r.addedBy),
        }];
    });
}

const ALLOWED_TERMS = new Set([3, 6, 9, 10, 12, 18, 24, 36]);

function cleanInstallments(v: unknown): any[] {
    if (!Array.isArray(v)) return [];
    return v.slice(0, 200).flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return [];
        const r = raw as any;
        const label = cleanString(r.label);
        const cardId = cleanString(r.cardId, 64);
        const startDate = cleanDate(r.startDate);
        if (!label || !cardId || !startDate) return [];
        const months = typeof r.months === 'number' ? Math.round(r.months) : parseInt(String(r.months), 10);
        return [{
            id: cleanId(r.id),
            cardId,
            label,
            totalAmount: cleanAmount(r.totalAmount),
            months: ALLOWED_TERMS.has(months) ? months : 12,
            startDate,
            ...cleanAddedBy(r.addedBy),
        }];
    });
}

function cleanBudgets(v: unknown): any[] {
    if (!Array.isArray(v)) return [];
    return v.slice(0, 100).flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return [];
        const r = raw as any;
        const category = cleanString(r.category, 60);
        if (!category) return [];
        return [{
            id: cleanId(r.id),
            category,
            monthlyLimit: cleanAmount(r.monthlyLimit),
            ...cleanAddedBy(r.addedBy),
        }];
    });
}

function cleanSettings(v: unknown): any {
    const r = (v && typeof v === 'object') ? v as any : {};
    const days = typeof r.autoSnapshotDays === 'number' ? r.autoSnapshotDays : 7;
    return {
        autoSnapshotDays: Math.max(1, Math.min(90, Math.round(days))),
    };
}

function cleanHistory(v: unknown): any[] {
    if (!Array.isArray(v)) return [];
    return v.slice(0, MAX_HISTORY).flatMap((raw) => {
        if (!raw || typeof raw !== 'object') return [];
        const r = raw as any;
        const date = cleanDate(r.date);
        if (!date) return [];
        return [{
            id: cleanId(r.id),
            date,
            totalAssets: cleanAmount(r.totalAssets),
            totalLiabilities: cleanAmount(r.totalLiabilities),
            totalBuckets: cleanAmount(r.totalBuckets),
            totalFixedCosts: cleanAmount(r.totalFixedCosts),
            available: cleanAmount(r.available, true),
            deficit: cleanAmount(r.deficit),
            auto: r.auto === true,
            assets: cleanFinanceItems(r.assets, 'asset'),
            liabilities: cleanFinanceItems(r.liabilities, 'liability'),
            buckets: cleanFinanceItems(r.buckets, 'bucket'),
            subscriptions: cleanSubscriptions(r.subscriptions),
            goals: cleanGoals(r.goals),
        }];
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — datos del usuario autenticado (se crean vacíos si no existen)
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        await dbConnect();

        // ── Cuentas compartidas: si soy miembro del documento de otra
        //    persona, ESE documento es mi fuente de verdad ─────────────
        const shared = await Finance.findOne({ 'members.userId': userId });
        if (shared) {
            if (typeof shared.rev !== 'number') {
                await Finance.updateOne({ _id: shared._id }, { $set: { rev: 0 } });
                shared.rev = 0;
            }
            return NextResponse.json(shared);
        }

        // Documentos creados por versiones anteriores no tienen `rev`.
        // Normalizarlo aquí evita falsos conflictos al guardar.
        await Finance.updateOne(
            { userId, $or: [{ rev: { $exists: false } }, { rev: null }] },
            { $set: { rev: 0 } }
        );

        const data = await Finance.findOneAndUpdate(
            { userId },
            {
                $setOnInsert: {
                    userId,
                    rev: 0,
                    assets: [],
                    liabilities: [],
                    buckets: [],
                    subscriptions: [],
                    goals: [],
                    transactions: [],
                    creditCards: [],
                    installments: [],
                    budgets: [],
                    history: [],
                },
            },
            { new: true, upsert: true }
        );
        return NextResponse.json(data);
    } catch (error) {
        console.error('[api/finance] GET failed:', error);
        return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — guarda el estado. Requiere baseRev para evitar que una pestaña o
// dispositivo con datos viejos sobreescriba datos más nuevos (last-write-wins).
// Si baseRev no coincide, responde 409 con los datos actuales del servidor.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    const { userId } = await auth();
    if (!userId) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const clean = {
        assets: cleanFinanceItems(body?.assets, 'asset'),
        liabilities: cleanFinanceItems(body?.liabilities, 'liability'),
        buckets: cleanFinanceItems(body?.buckets, 'bucket'),
        subscriptions: cleanSubscriptions(body?.subscriptions),
        goals: cleanGoals(body?.goals),
        transactions: cleanTransactions(body?.transactions),
        creditCards: cleanCreditCards(body?.creditCards),
        installments: cleanInstallments(body?.installments),
        budgets: cleanBudgets(body?.budgets),
        settings: cleanSettings(body?.settings),
        history: cleanHistory(body?.history),
    };

    const baseRev = Number.isInteger(body?.baseRev) ? body.baseRev : null;

    try {
        await dbConnect();

        // ── Cuentas compartidas: los guardados de un miembro van al
        //    documento del dueño, con el mismo control de conflictos ──
        const shared = await Finance.findOne({ 'members.userId': userId }).select('_id');
        if (shared) {
            const revMatch = baseRev === 0 || baseRev === null
                ? { $or: [{ rev: baseRev ?? 0 }, { rev: { $exists: false } }, { rev: null }] }
                : { rev: baseRev };
            if (baseRev !== null) {
                const updated = await Finance.findOneAndUpdate(
                    { _id: shared._id, ...revMatch },
                    { $set: { ...clean, rev: baseRev + 1 } },
                    { new: true }
                );
                if (updated) return NextResponse.json(updated);
                const current = await Finance.findById(shared._id);
                return NextResponse.json({ error: 'conflict', server: current }, { status: 409 });
            }
            const updated = await Finance.findOneAndUpdate(
                { _id: shared._id },
                { $set: clean, $inc: { rev: 1 } },
                { new: true }
            );
            return NextResponse.json(updated);
        }

        if (baseRev !== null) {
            // Guardado con control de concurrencia optimista.
            // `rev` ausente (documento de una versión anterior) cuenta como
            // coincidencia con baseRev 0 para no generar falsos conflictos.
            const revMatch = baseRev === 0
                ? { $or: [{ rev: 0 }, { rev: { $exists: false } }, { rev: null }] }
                : { rev: baseRev };
            const updated = await Finance.findOneAndUpdate(
                { userId, ...revMatch },
                { $set: { ...clean, rev: baseRev + 1 } },
                { new: true }
            );
            if (updated) return NextResponse.json(updated);

            // rev no coincide → alguien más guardó primero. Devolver estado actual.
            const current = await Finance.findOne({ userId });
            if (current) {
                return NextResponse.json(
                    { error: 'conflict', server: current },
                    { status: 409 }
                );
            }
            // No existía documento: crearlo
        }

        // Fallback (cliente viejo sin baseRev, o documento inexistente): upsert
        const data = await Finance.findOneAndUpdate(
            { userId },
            { $set: clean, $inc: { rev: 1 } },
            { new: true, upsert: true }
        );
        return NextResponse.json(data);
    } catch (error) {
        console.error('[api/finance] POST failed:', error);
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}
