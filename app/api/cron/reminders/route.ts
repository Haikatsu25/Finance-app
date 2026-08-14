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

function buildReminders(cards: any[], now: Date): Reminder[] {
    const out: Reminder[] = [];
    for (const c of cards || []) {
        if (!c?.label) continue;

        // Fecha límite de pago — solo si hay deuda
        if ((c.balance || 0) > 0 && c.dueDay) {
            const d = daysUntil(nextOccurrence(c.dueDay, now), now);
            if (d === 3) out.push({
                title: `💳 ${c.label}: pago en 3 días`,
                body: `Paga ${fmtMXN(c.balance)} antes del día ${c.dueDay} para no generar intereses.`,
            });
            if (d === 1) out.push({
                title: `⚠️ ${c.label}: pago MAÑANA`,
                body: `Último día para pagar ${fmtMXN(c.balance)} sin intereses es mañana.`,
            });
            if (d === 0) out.push({
                title: `🚨 ${c.label}: el pago vence HOY`,
                body: `Paga ${fmtMXN(c.balance)} hoy mismo para evitar intereses y cargos.`,
            });
        }

        // Fecha de corte — informativa
        if (c.cutoffDay) {
            const d = daysUntil(nextOccurrence(c.cutoffDay, now), now);
            if (d === 1) out.push({
                title: `📅 ${c.label}: corte mañana`,
                body: `Lo que compres desde pasado mañana se irá al siguiente estado de cuenta.`,
            });
            if (d === 0) out.push({
                title: `📅 ${c.label}: hoy es tu corte`,
                body: `Compras a partir de mañana = más días de financiamiento.`,
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
            { userId: 1, creditCards: 1, pushSubscriptions: 1 },
        ).lean();

        const now = new Date();
        let sent = 0, pruned = 0;

        for (const user of users as any[]) {
            const reminders = buildReminders(user.creditCards, now);
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
