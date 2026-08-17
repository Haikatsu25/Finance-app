import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/db';
import Finance from '@/models/Finance';
import { aiChat, AiMessage } from '@/lib/ai';

// ─────────────────────────────────────────────────────────────────
// Chat financiero con Gemini (tier gratuito). La IA recibe un
// RESUMEN de las finanzas del usuario — nunca el documento crudo.
// En cuentas compartidas usa el documento compartido.
// ─────────────────────────────────────────────────────────────────

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LEN = 2000;

function buildFinancialContext(doc: any): string {
    const sum = (arr: any[]) => (arr || []).reduce((s: number, i: any) => s + (i.amount || 0), 0);

    const totalAssets = sum(doc.assets);
    const totalLiabilities = sum(doc.liabilities);
    const totalBuckets = sum(doc.buckets);
    const fixedMonthly = (doc.subscriptions || []).reduce(
        (s: number, i: any) => s + (i.billingCycle === 'anual' ? (i.amount || 0) / 12 : (i.amount || 0)), 0);

    // Mensualidades MSI activas
    const now = new Date();
    let msiMonthly = 0;
    let msiRemaining = 0;
    for (const p of doc.installments || []) {
        if (!p?.months || !p?.startDate) continue;
        const start = new Date(p.startDate + 'T12:00:00');
        if (isNaN(start.getTime())) continue;
        let elapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        if (now.getDate() < start.getDate()) elapsed -= 1;
        elapsed = Math.max(0, elapsed);
        if (elapsed >= p.months) continue;
        const monthly = (p.totalAmount || 0) / p.months;
        msiMonthly += monthly;
        msiRemaining += (p.totalAmount || 0) - monthly * elapsed;
    }

    // Últimos 60 días de movimientos por categoría
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const recent = (doc.transactions || []).filter((t: any) => t.date >= cutoffStr);
    const byCat = new Map<string, number>();
    let recentIncome = 0, recentExpense = 0;
    for (const t of recent) {
        if (t.type === 'income') recentIncome += t.amount || 0;
        else {
            recentExpense += t.amount || 0;
            byCat.set(t.category || 'Otros', (byCat.get(t.category || 'Otros') || 0) + (t.amount || 0));
        }
    }
    const topCats = Array.from(byCat, ([c, a]) => ({ c, a }))
        .sort((x, y) => y.a - x.a)
        .slice(0, 8)
        .map(({ c, a }) => `${c}: $${a.toFixed(0)}`)
        .join(', ') || 'sin datos';

    const cards = (doc.creditCards || []).map((c: any) =>
        `${c.label}: contado $${(c.balance || 0).toFixed(0)}, límite $${(c.creditLimit || 0).toFixed(0)}, corte día ${c.cutoffDay}, paga día ${c.dueDay}`
    ).join('; ') || 'ninguna';

    const budgets = (doc.budgets || []).map((b: any) =>
        `${b.category}: límite $${(b.monthlyLimit || 0).toFixed(0)}`
    ).join('; ') || 'ninguno';

    const goals = (doc.goals || []).map((g: any) =>
        `${g.label}: $${(g.currentAmount || 0).toFixed(0)}/$${(g.targetAmount || 0).toFixed(0)} para ${g.deadline}`
    ).join('; ') || 'ninguna';

    return `RESUMEN FINANCIERO DEL USUARIO (moneda MXN, hoy es ${now.toISOString().split('T')[0]}):
- Activos totales: $${totalAssets.toFixed(0)}
- Deudas/gastos registrados: $${totalLiabilities.toFixed(0)}
- Apartados: $${totalBuckets.toFixed(0)}
- Disponible bruto: $${(totalAssets - totalLiabilities - totalBuckets).toFixed(0)}
- Gastos fijos mensuales: $${fixedMonthly.toFixed(0)}
- Mensualidades MSI de este mes: $${msiMonthly.toFixed(0)} (saldo total a meses: $${msiRemaining.toFixed(0)})
- Disponible real del mes: $${(totalAssets - totalLiabilities - totalBuckets - fixedMonthly - msiMonthly).toFixed(0)}
- Últimos 60 días: ingresos $${recentIncome.toFixed(0)}, gastos $${recentExpense.toFixed(0)}
- Gasto por categoría (60d): ${topCats}
- Tarjetas de crédito: ${cards}
- Presupuestos: ${budgets}
- Metas de ahorro: ${goals}`;
}

const SYSTEM_PROMPT = `Eres FinanceAI, el asistente financiero personal de la app Finance Control.
Respondes SIEMPRE en español mexicano, con tono cercano pero profesional.
Reglas:
- Usa los datos del resumen financiero para dar respuestas concretas con números reales del usuario.
- Sé breve: 2-4 oraciones para preguntas simples; usa listas solo si piden un plan.
- Puedes hacer aritmética simple (cuánto le queda, cuánto ahorrar al mes, etc.).
- Si te preguntan algo fuera de finanzas personales, redirige amablemente al tema.
- No inventes datos que no estén en el resumen; si falta información, dilo y sugiere registrarla en la app.
- Nunca des consejos de inversión específicos (acciones, cripto concretas); recuerda que no eres asesor certificado.`;

export async function POST(request: Request) {
    const { userId } = await auth();
    if (!userId) return new NextResponse('Unauthorized', { status: 401 });

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
    const messages: AiMessage[] = rawMessages
        .slice(-MAX_MESSAGES)
        .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .map((m: any) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LEN) }));

    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
        return NextResponse.json({ error: 'No user message' }, { status: 400 });
    }

    try {
        await dbConnect();
        // Cuentas compartidas: usar el documento compartido si soy miembro
        const doc = await Finance.findOne({ 'members.userId': userId }).lean()
            || await Finance.findOne({ userId }).lean();
        const context = doc ? buildFinancialContext(doc) : 'El usuario aún no tiene datos registrados.';

        const reply = await aiChat({
            system: `${SYSTEM_PROMPT}\n\n${context}`,
            messages,
            maxTokens: 800,
        });

        return NextResponse.json({ reply });
    } catch (error: any) {
        if (error?.message === 'MISSING_API_KEY') {
            return NextResponse.json(
                { error: 'missing_key', reply: 'Falta configurar la clave gratuita de Gemini (GEMINI_API_KEY) en el servidor.' },
                { status: 503 },
            );
        }
        if (error?.message === 'RATE_LIMITED') {
            return NextResponse.json(
                { error: 'rate_limited', reply: 'La IA alcanzó su límite gratuito por ahora. Intenta en un minuto.' },
                { status: 429 },
            );
        }
        if (error?.message === 'BAD_KEY') {
            return NextResponse.json(
                { error: 'bad_key', reply: 'La clave GEMINI_API_KEY parece inválida o restringida. Verifica que se copió completa y sin espacios, y que en Vercel se hizo Redeploy después de agregarla.' },
                { status: 502 },
            );
        }
        console.error('[api/ai/chat] failed:', error);
        return NextResponse.json(
            { error: 'ai_failed', reply: `La IA no respondió (${error?.message || 'error desconocido'}). Revisa los logs de Vercel para el detalle.` },
            { status: 500 },
        );
    }
}
