// Recordatorios de tarjetas para el cron diario (app/api/cron/reminders).
// Vive aquí, y no dentro del route, para poder probarse sin web-push ni Mongo.
//
// Fechas límite de pago (5, 3, 1 y 0 días antes, y el día siguiente si venció sin
// marcarse como pagado) y de corte (5, 3, 1 y 0 días antes).
import { nextOccurrence, paymentDueDate, daysUntil } from "./finance-utils";

const fmtMXN = (n: number) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

export interface Reminder {
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

export function buildReminders(cards: any[], installments: any[], now: Date): Reminder[] {
    const out: Reminder[] = [];
    for (const c of cards || []) {
        if (!c?.label) continue;

        const msi = monthlyInstallmentFor(c.id, installments, now);
        const dueAmount = (c.balance || 0) + msi;
        const msiNote = msi > 0 ? ` (incluye ${fmtMXN(msi)} de meses sin intereses)` : '';

        // ── Fecha límite de PAGO ──
        // paymentDueDate respeta el botón "Pagado": un ciclo ya pagado no se avisa.
        if (dueAmount > 0 && c.dueDay) {
            const d = daysUntil(paymentDueDate(c, now), now);
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
            // Vencido y sin marcar como pagado: se avisa UNA vez, al día siguiente
            if (d === -1) out.push({
                title: `🚨 ${c.label}: pago vencido`,
                body: `La fecha límite fue ayer (día ${c.dueDay}) y tu pago de ${fmtMXN(dueAmount)} sigue sin marcarse. Si ya pagaste, toca "Pagado" en la app.`,
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
