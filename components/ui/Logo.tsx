// Logo "Crece": tres barras que suben y un punto. Las barras toman pop4, pop2 y pop1 y el punto
// --logo-dot, así que el mismo componente sirve en claro y en noche (mark.svg, sin el fondo).
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="10 8 44 48"
      width={(size * 44) / 48}
      height={size}
      className={className}
      role="img"
      aria-label="Finance Control"
    >
      <rect x="14" y="40" width="10" height="12" rx="4" fill="var(--pop4)" />
      <rect x="27" y="30" width="10" height="22" rx="4" fill="var(--pop2)" />
      <rect x="40" y="18" width="10" height="34" rx="4" fill="var(--pop1)" />
      <circle cx="45" cy="12" r="4" fill="var(--logo-dot)" />
    </svg>
  );
}
