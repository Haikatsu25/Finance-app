// Formato de dinero centralizado — es-MX, sin sorpresas de punto flotante en UI.
// Incluye el "modo privacidad": cuando está activo, todos los montos que pasan
// por money()/moneyExact() se enmascaran. Como el Dashboard no memoiza hijos,
// alternar el estado en la raíz re-renderiza todo con la máscara aplicada.

let privacyOn = false;
const PRIVACY_KEY = "fc_privacy";

export function setPrivacyMode(on: boolean) {
    privacyOn = on;
    try {
        if (typeof window !== "undefined") localStorage.setItem(PRIVACY_KEY, on ? "1" : "0");
    } catch { /* storage no disponible */ }
}

export function loadPrivacyMode(): boolean {
    try {
        if (typeof window !== "undefined") {
            privacyOn = localStorage.getItem(PRIVACY_KEY) === "1";
        }
    } catch { /* storage no disponible */ }
    return privacyOn;
}

const MASK = "$ ••••";

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
    if (privacyOn) return MASK;
    if (!Number.isFinite(n)) n = 0;
    return MXN0.format(n);
}

/** $12,345.67 — para totales de sección y comprobantes */
export function moneyExact(n: number): string {
    if (privacyOn) return MASK;
    if (!Number.isFinite(n)) n = 0;
    return MXN2.format(n);
}

/** Partes del monto para el hero estilo fintech: entero grande + centavos atenuados */
export function moneyParts(n: number): { int: string; cents: string; masked: boolean } {
    if (privacyOn) return { int: MASK, cents: "", masked: true };
    if (!Number.isFinite(n)) n = 0;
    const full = MXN2.format(n); // ej. $12,540.28
    const dot = full.lastIndexOf(".");
    if (dot === -1) return { int: full, cents: "", masked: false };
    return { int: full.slice(0, dot), cents: full.slice(dot), masked: false };
}

/** Redondeo seguro a 2 decimales para cálculos previos a guardar */
export function round2(n: number): number {
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100) / 100;
}
