import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { aiVision } from '@/lib/ai';

// ─────────────────────────────────────────────────────────────────
// Escáner de tickets con Gemini (visión, tier gratuito): recibe la
// foto en base64 y devuelve {label, amount, date, category}.
// ─────────────────────────────────────────────────────────────────

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BASE64_LEN = 7_000_000; // ~5 MB de imagen

const SCAN_PROMPT = `Analiza esta foto de un ticket o recibo de compra mexicano.
Extrae y responde ÚNICAMENTE un objeto JSON válido, sin texto adicional ni markdown:
{"label": "<nombre corto del comercio>", "amount": <total como número>, "date": "<fecha YYYY-MM-DD o cadena vacía si no se ve>", "category": "<una de: Comida, Súper, Transporte, Hogar, Servicios, Salud, Entretenimiento, Ropa, Educación, Suscripción, Otros>"}
Si la imagen no es un ticket legible, responde: {"error": "no_legible"}`;

export async function POST(request: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const mediaType = typeof body?.mediaType === 'string' ? body.mediaType : '';
    const data = typeof body?.data === 'string' ? body.data : '';

    if (!ALLOWED_TYPES.has(mediaType) || !data || data.length > MAX_BASE64_LEN) {
        return NextResponse.json({ error: 'bad_image' }, { status: 400 });
    }

    try {
        const raw = await aiVision({
            prompt: SCAN_PROMPT,
            mediaType,
            base64: data,
            maxTokens: 300,
        });

        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return NextResponse.json({ error: 'no_parse' }, { status: 422 });

        const parsed = JSON.parse(match[0]);
        if (parsed.error) return NextResponse.json({ error: 'no_legible' }, { status: 422 });

        const amount = typeof parsed.amount === 'number' ? parsed.amount : parseFloat(parsed.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
            return NextResponse.json({ error: 'no_parse' }, { status: 422 });
        }

        return NextResponse.json({
            label: String(parsed.label || 'Ticket').slice(0, 80),
            amount: Math.round(amount * 100) / 100,
            date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : '',
            category: String(parsed.category || 'Otros').slice(0, 40),
        });
    } catch (error: any) {
        if (error?.message === 'MISSING_API_KEY') {
            return NextResponse.json({ error: 'missing_key' }, { status: 503 });
        }
        if (error?.message === 'RATE_LIMITED') {
            return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
        }
        if (error?.message === 'BAD_KEY') {
            return NextResponse.json({ error: 'bad_key' }, { status: 502 });
        }
        console.error('[api/ai/scan] failed:', error);
        return NextResponse.json({ error: 'ai_failed' }, { status: 500 });
    }
}
