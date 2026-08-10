// Formato de dinero centralizado — es-MX, sin sorpresas de punto flotante en UI.

const MXN0 = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
});

const MXN2 = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

/** $12,345 — para números grandes (héroe, stats, tablas) */
export function money(n: number): string {
    if (!Number.isFinite(n)) n = 0;
    return MXN0.format(n);
}

/** $12,345.67 — para totales de sección y comprobantes */
export function moneyExact(n: number): string {
    if (!Number.isFinite(n)) n = 0;
    return MXN2.format(n);
}

/** Redondeo seguro a 2 decimales para cálculos previos a guardar */
export function round2(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
}
