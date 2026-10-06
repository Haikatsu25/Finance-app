// ─────────────────────────────────────────────────────────────────────────────
// TONOS — mapa explícito de clases. Tailwind escanea el código como texto,
// así que las clases deben aparecer COMPLETAS (nunca `bg-${color}-500/10`).
// ─────────────────────────────────────────────────────────────────────────────
export type ToneName = "emerald" | "rose" | "amber" | "indigo" | "purple" | "blue";

export const TONE: Record<ToneName, {
  text: string; textStrong: string; bg: string; bgBadge: string;
  border: string; iconBg: string;
}> = {
  emerald: { text: "text-emerald-600 dark:text-emerald-400", textStrong: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10", bgBadge: "bg-emerald-500/12", border: "border-emerald-500/20", iconBg: "bg-emerald-500/12" },
  rose:    { text: "text-rose-600 dark:text-rose-400",       textStrong: "text-rose-700 dark:text-rose-300",       bg: "bg-rose-500/10",    bgBadge: "bg-rose-500/12",    border: "border-rose-500/20",    iconBg: "bg-rose-500/12" },
  amber:   { text: "text-amber-600 dark:text-amber-400",     textStrong: "text-amber-700 dark:text-amber-300",     bg: "bg-amber-500/10",   bgBadge: "bg-amber-500/12",   border: "border-amber-500/20",   iconBg: "bg-amber-500/12" },
  indigo:  { text: "text-indigo-600 dark:text-indigo-400",   textStrong: "text-indigo-700 dark:text-indigo-300",   bg: "bg-indigo-500/10",  bgBadge: "bg-indigo-500/12",  border: "border-indigo-500/20",  iconBg: "bg-indigo-500/12" },
  purple:  { text: "text-purple-600 dark:text-purple-400",   textStrong: "text-purple-700 dark:text-purple-300",   bg: "bg-purple-500/10",  bgBadge: "bg-purple-500/12",  border: "border-purple-500/20",  iconBg: "bg-purple-500/12" },
  blue:    { text: "text-blue-600 dark:text-blue-400",       textStrong: "text-blue-700 dark:text-blue-300",       bg: "bg-blue-500/10",    bgBadge: "bg-blue-500/12",    border: "border-blue-500/20",    iconBg: "bg-blue-500/12" },
};

export const SECTION_TONE: Record<"success" | "danger" | "warning", ToneName> = {
  success: "emerald",
  danger: "rose",
  warning: "amber",
};
