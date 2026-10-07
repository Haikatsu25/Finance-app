"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON — carga con forma, nunca pantalla en blanco
// ─────────────────────────────────────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <main className="view" aria-busy="true" aria-label="Cargando tus finanzas">
      <div className="skeleton h-[240px]" style={{ borderRadius: 28 }} />
      <div className="tiles">
        <div className="skeleton h-[110px]" />
        <div className="skeleton h-[110px]" />
        <div className="skeleton h-[110px]" />
      </div>
      <div className="skeleton h-[180px]" />
      <div className="skeleton h-[220px]" />
    </main>
  );
}
