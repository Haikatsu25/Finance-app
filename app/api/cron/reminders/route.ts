import { NextResponse } from 'next/server';
import webpush from 'web-push';
import dbConnect from '@/lib/db';
import Finance from '@/models/Finance';
import { buildReminders } from '@/lib/reminders';

// ─────────────────────────────────────────────────────────────────
// Cron diario (vercel.json): revisa las tarjetas de TODOS los
// usuarios con notificaciones activas y envía recordatorios de
// fecha límite de pago (5, 3, 1 y 0 días antes, y el día siguiente si venció sin
// marcarse como pagado) y de corte. La lógica vive en lib/reminders.ts (con tests).
//
// Protegido con CRON_SECRET: Vercel lo manda como
// "Authorization: Bearer <CRON_SECRET>" automáticamente.
// ─────────────────────────────────────────────────────────────────

export const maxDuration = 60;

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
