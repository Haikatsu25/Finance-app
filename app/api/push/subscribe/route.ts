import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import Finance from '@/models/Finance';

// Alta/baja de suscripciones push por dispositivo.
// Se manejan FUERA del POST general de /api/finance para que un guardado
// normal desde otro dispositivo nunca borre las suscripciones.

const MAX_SUBS_PER_USER = 10;

export async function POST(request: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint.slice(0, 1024) : '';
    const p256dh = typeof body?.keys?.p256dh === 'string' ? body.keys.p256dh.slice(0, 256) : '';
    const authKey = typeof body?.keys?.auth === 'string' ? body.keys.auth.slice(0, 256) : '';

    if (!endpoint.startsWith('https://') || !p256dh || !authKey) {
        return NextResponse.json({ error: 'bad_subscription' }, { status: 400 });
    }

    try {
        await dbConnect();
        // Reemplazar si ya existe ese endpoint, luego agregar
        await Finance.updateOne(
            { userId },
            { $pull: { pushSubscriptions: { endpoint } } },
        );
        await Finance.updateOne(
            { userId },
            {
                $push: {
                    pushSubscriptions: {
                        $each: [{ endpoint, keys: { p256dh, auth: authKey }, createdAt: new Date().toISOString() }],
                        $slice: -MAX_SUBS_PER_USER, // conservar las más recientes
                    },
                },
            },
            { upsert: true },
        );
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[api/push/subscribe] failed:', error);
        return NextResponse.json({ error: 'failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : '';
    if (!endpoint) return NextResponse.json({ error: 'no_endpoint' }, { status: 400 });

    try {
        await dbConnect();
        await Finance.updateOne(
            { userId },
            { $pull: { pushSubscriptions: { endpoint } } },
        );
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[api/push/subscribe] DELETE failed:', error);
        return NextResponse.json({ error: 'failed' }, { status: 500 });
    }
}
