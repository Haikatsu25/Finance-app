import { NextResponse } from 'next/server';
import webpush from 'web-push';
import dbConnect from '@/lib/db';
import Finance from '@/models/Finance';

// ─────────────────────────────────────────────────────────────────
// Cron diario (vercel.json): revisa las tarjetas de TODOS los
// usuarios con notificaciones activas y envía recordatorios de
// fecha límite de pago (3, 1 y 0 días antes) y de corte (1 y 0).
//
// Protegido con CRON_SECRET: Vercel lo manda como
// "Authorization: Bearer <CRON_SECRET>" automáticamente.
// ─────────────────────────────────────────────────────────────────

export const maxDuration = 60;

function nextOccurrence(dayOfMonth: number, from: Date): Date {
    const clamp = (y: number, m: number, d: number) => {
        const last = new Date(y, m + 1, 0).getDate();
        return new Date(y, m, Math.min(d, last));
    };
    const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    let candidate = clamp(today.getFullYear(), today.getMonth(), dayOfMonth);
    if (candidate < today) candidate = clamp(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
    return candidate;
}

function daysUntil(date: Date, from: Date): number {
    const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
    return Math.round((date.getTime() - a) / 86_400_000);
}

const fmtMXN = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

interface Reminder {
    title: string;
    body: string;
}

/** Mensualidad de MSI activa para una tarjeta en la fecha dada. */
function monthlyInstallmentFor(cardId: string, installments: any[], now: Date): number {
    let total = 0;
    for (const p of installments || []) {
        if (p?.cardId !== cardId || !p?.months || !p?.startDate) continue;
        const start = new Date(p.startDate + 'T12:00:00');
        if (isNaN(start.getTime())) continue;
        let elapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        if (now.getDate() < start.getDate()) elapsed -= 1;
        elapsed = Math.max(0, elapsed);
        if (elapsed >= p.months) continue; // ya liquidada
        total += (p.totalAmount || 0) / p.months;
    }
    return Math.round(total * 100) / 100;
}

function buildReminders(cards: any[], installments: any[], now: Date): Reminder[] {
    const out: Reminder[] = [];
    for (const c of cards || []) {
        if (!c?.label) continue;

        const msi = monthlyInstallmentFor(c.id, installments, now);
        const dueAmount = (c.balance || 0) + msi;
        const msiNote = msi > 0 ? ` (incluye ${fmtMXN(msi)} de meses sin intereses)` : '';

        // ── Fecha límite de PAGO ──
        if (dueAmount > 0 && c.dueDay) {
            const d = daysUntil(nextOccurrence(c.dueDay, now), now);
            if (d === 5) out.push({
                title: `💳 ${c.label}: pago en 5 días`,
                body: `Te tocan ${fmtMXN(dueAmount)} el día ${c.dueDay}${msiNote}.`,
            });
            if (d === 3) out.push({
                title: `💳 ${c.label}: pago en 3 días`,
                body: `Paga ${fmtMXN(dueAmount)} antes del día ${c.dueDay} para no generar intereses${msiNote}.`,
            });
            if (d === 1) out.push({
                title: `⚠️ ${c.label}: pago MAÑANA`,
                body: `Último día para pagar ${fmtMXN(dueAmount)} sin intereses es mañana.`,
            });
            if (d === 0) out.push({
                title: `🚨 ${c.label}: el pago vence HOY`,
                body: `Paga ${fmtMXN(dueAmount)} hoy mismo para evitar intereses y cargos.`,
            });
        }

        // ── Fecha de CORTE — con cuenta regresiva ──
        if (c.cutoffDay) {
            const d = daysUntil(nextOccurrence(c.cutoffDay, now), now);
            if (d === 5) out.push({
                title: `📅 ${c.label}: corte en 5 días`,
                body: `Cierra tu estado de cuenta el día ${c.cutoffDay}. Compras después del corte se pagan hasta el siguiente ciclo.`,
            });
            if (d === 3) out.push({
                title: `📅 ${c.label}: corte en 3 días`,
                body: `Si puedes esperar al día ${c.cutoffDay + 1}, ganas casi un mes extra de financiamiento.`,
            });
            if (d === 1) out.push({
                title: `📅 ${c.label}: corte MAÑANA`,
                body: `Lo que compres desde pasado mañana se irá al siguiente estado de cuenta.`,
            });
            if (d === 0) out.push({
                title: `📅 ${c.label}: hoy es tu corte`,
                body: `A partir de mañana empieza tu nuevo ciclo — máximo financiamiento.`,
            });
        }
    }
    return out;
}

export async function GET(request: Request) {
    const secret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization') || '';
    if (!secret || authHeader !== `Bearer ${secret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate) {
        return NextResponse.json({ error: 'vapid_not_configured' }, { status: 503 });
    }
    webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
        vapidPublic,
        vapidPrivate,
    );

    try {
        await dbConnect();
        const users = await Finance.find(
            { 'pushSubscriptions.0': { $exists: true }, 'creditCards.0': { $exists: true } },
            { userId: 1, creditCards: 1, installments: 1, pushSubscriptions: 1 },
        ).lean();

        const now = new Date();
        let sent = 0, pruned = 0;

        for (const user of users as any[]) {
            const reminders = buildReminders(user.creditCards, user.installments || [], now);
            if (reminders.length === 0) continue;

            const dead: string[] = [];
            for (const sub of user.pushSubscriptions) {
                for (const r of reminders) {
                    try {
                        await webpush.sendNotification(
                            { endpoint: sub.endpoint, keys: sub.keys },
                            JSON.stringify({ title: r.title, body: r.body, url: '/' }),
                        );
                        sent++;
                    } catch (err: any) {
                        if (err?.statusCode === 404 || err?.statusCode === 410) {
                            dead.push(sub.endpoint);
                        }
                        break; // no insistir con este dispositivo
                    }
                }
            }

            if (dead.length) {
                pruned += dead.length;
                await Finance.updateOne(
                    { userId: user.userId },
                    { $pull: { pushSubscriptions: { endpoint: { $in: dead } } } },
                );
            }
        }

        return NextResponse.json({ ok: true, users: users.length, sent, pruned });
    } catch (error) {
        console.error('[api/cron/reminders] failed:', error);
        return NextResponse.json({ error: 'failed' }, { status: 500 });
    }
}
