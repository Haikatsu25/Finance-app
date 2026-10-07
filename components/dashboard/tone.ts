// ─────────────────────────────────────────────────────────────────────────────
// TONOS — el color significa dinero y nada más.
//   emerald → entra (--money-in)      rose → sale (--money-out)
//   amber   → se aparta (--money-hold)
//   indigo / blue → sin dirección de dinero: tinta neutra
//   purple  → metas: dinero apartado, igual que amber
// Los nombres de las llaves se conservan; los colores salen de los tokens de
// globals.css vía @theme (text-money-in-text, bg-money-in/10…). Tailwind escanea
// el código como texto, así que las clases deben aparecer COMPLETAS.
// ─────────────────────────────────────────────────────────────────────────────
export type ToneName = "emerald" | "rose" | "amber" | "indigo" | "purple" | "blue";

type Tone = {
  text: string; textStrong: string; bg: string; bgBadge: string;
  border: string; iconBg: string;
  /** Filo superior del panel */
  rule: string;
  /** Relleno plano (barras, puntos de leyenda) */
  fill: string;
};

const IN: Tone = {
  text: "text-money-in-text", textStrong: "text-money-in-text",
  bg: "bg-money-in/10", bgBadge: "bg-money-in/10", border: "border-money-in/30", iconBg: "bg-money-in/15",
  rule: "rule-in", fill: "bg-money-in",
};
const OUT: Tone = {
  text: "text-money-out-text", textStrong: "text-money-out-text",
  bg: "bg-money-out/10", bgBadge: "bg-money-out/10", border: "border-money-out/30", iconBg: "bg-money-out/15",
  rule: "rule-out", fill: "bg-money-out",
};
const HOLD: Tone = {
  text: "text-money-hold-text", textStrong: "text-money-hold-text",
  bg: "bg-money-hold/12", bgBadge: "bg-money-hold/12", border: "border-money-hold/35", iconBg: "bg-money-hold/18",
  rule: "rule-hold", fill: "bg-money-hold",
};
const INK: Tone = {
  text: "text-ink", textStrong: "text-ink",
  bg: "bg-ink/5", bgBadge: "bg-ink/5", border: "border-ink/20", iconBg: "bg-ink/10",
  rule: "rule-ink", fill: "bg-ink",
};

export const TONE: Record<ToneName, Tone> = {
  emerald: IN,
  rose: OUT,
  amber: HOLD,
  indigo: INK,
  purple: HOLD,
  blue: INK,
};

export const SECTION_TONE: Record<"success" | "danger" | "warning", ToneName> = {
  success: "emerald",
  danger: "rose",
  warning: "amber",
};
