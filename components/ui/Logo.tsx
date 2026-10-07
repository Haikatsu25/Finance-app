// Logo "Tarjeta al día": una tarjeta con su banda y su chip, y un medallón con palomita. Es el
// mark.svg de docs/design-pop/logo/ sin el fondo. La tarjeta toma pop1, el medallón pop2, y la
// banda, el borde del medallón y la palomita --logo-dot, así que el mismo componente sirve en claro
// y en noche; el chip es blanco al 80 %.
export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="9 15 50 43"
      width={(size * 50) / 43}
      height={size}
      className={className}
      overflow="visible" /* el borde del medallón (x hasta 60.5) sale 1.5 del viewBox de mark.svg */
      role="img"
      aria-label="Finance Control"
    >
      <rect x="11" y="17" width="42" height="28" rx="7" fill="var(--pop1)" />
      <rect x="11" y="24" width="42" height="6" fill="var(--logo-dot)" />
      <rect x="17" y="35" width="12" height="4" rx="2" fill="#ffffff" opacity="0.8" />
      <circle cx="48" cy="45" r="11" fill="var(--pop2)" stroke="var(--logo-dot)" strokeWidth="3" />
      <path d="M42.5 45l3.5 3.5 7-7" fill="none" stroke="var(--logo-dot)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
