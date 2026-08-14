import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import Finance from '@/models/Finance';

// ─────────────────────────────────────────────────────────────────
// Cuentas compartidas
//   invite → el dueño genera un código temporal (72 h)
//   join   → otra persona entra con el código y queda como miembro
//   leave  → un miembro se sale
//   remove → el dueño expulsa a un miembro
// ─────────────────────────────────────────────────────────────────

const MAX_MEMBERS = 5;
const INVITE_HOURS = 72;

// Sin caracteres ambiguos (0/O, 1/I/L)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(): string {
    const arr = new Uint32Array(6);
    crypto.getRandomValues(arr);
    return Array.from(arr, (n) => CODE_CHARS[n % CODE_CHARS.length]).join('');
}

export async function POST(request: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const action = typeof body?.action === 'string' ? body.action : '';

    try {
        await dbConnect();

        // ── Generar código de invitación ─────────────────────────
        if (action === 'invite') {
            // No puedes invitar si tú mismo estás dentro de las cuentas de otro
            const memberOf = await Finance.findOne({ 'members.userId': userId }).select('_id');
            if (memberOf) return NextResponse.json({ error: 'already_member' }, { status: 400 });

            const code = generateCode();
            const expiresAt = new Date(Date.now() + INVITE_HOURS * 3600_000).toISOString();
            await Finance.updateOne(
                { userId },
                { $set: { invite: { code, expiresAt } }, $setOnInsert: { userId, rev: 0 } },
                { upsert: true },
            );
            return NextResponse.json({ code, expiresAt });
        }

        // ── Unirse con un código ─────────────────────────────────
        if (action === 'join') {
            const code = String(body?.code || '').trim().toUpperCase();
            if (!/^[A-Z2-9]{6}$/.test(code)) {
                return NextResponse.json({ error: 'bad_code' }, { status: 400 });
            }

            const target = await Finance.findOne({ 'invite.code': code });
            if (!target || !target.invite?.expiresAt || new Date(target.invite.expiresAt) < new Date()) {
                return NextResponse.json({ error: 'invalid_or_expired' }, { status: 404 });
            }
            if (target.userId === userId) {
                return NextResponse.json({ error: 'own_code' }, { status: 400 });
            }
            if ((target.members || []).some((m: any) => m.userId === userId)) {
                return NextResponse.json({ ok: true }); // ya era miembro
            }
            if ((target.members || []).length >= MAX_MEMBERS) {
                return NextResponse.json({ error: 'full' }, { status: 400 });
            }

            // Si YO soy dueño de un grupo con miembros, no puedo unirme a otro
            const myDoc = await Finance.findOne({ userId }).select('members');
            if (myDoc && (myDoc.members || []).length > 0) {
                return NextResponse.json({ error: 'has_members' }, { status: 400 });
            }

            await Finance.updateOne(
                { _id: target._id },
                {
                    $push: {
                        members: {
                            userId,
                            name: String(body?.name || '').slice(0, 80),
                            email: String(body?.email || '').slice(0, 120),
                            joinedAt: new Date().toISOString(),
                        },
                    },
                },
            );
            return NextResponse.json({ ok: true });
        }

        // ── Salir de las cuentas compartidas ─────────────────────
        if (action === 'leave') {
            await Finance.updateOne(
                { 'members.userId': userId },
                { $pull: { members: { userId } } },
            );
            return NextResponse.json({ ok: true });
        }

        // ── Expulsar a un miembro (solo el dueño) ────────────────
        if (action === 'remove') {
            const memberId = String(body?.memberId || '');
            if (!memberId) return NextResponse.json({ error: 'no_member' }, { status: 400 });
            await Finance.updateOne(
                { userId }, // solo mi propio documento
                { $pull: { members: { userId: memberId } } },
            );
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
    } catch (error) {
        console.error('[api/share] failed:', error);
        return NextResponse.json({ error: 'failed' }, { status: 500 });
    }
}
