"use client";

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON — carga con forma, nunca pantalla en blanco
// ─────────────────────────────────────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6" aria-busy="true" aria-label="Cargando tus finanzas">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="col-span-1 md:col-span-8 skeleton h-[280px]" />
        <div className="col-span-1 md:col-span-4 flex flex-col gap-3">
          <div className="skeleton h-[86px]" />
          <div className="skeleton h-[86px]" />
          <div className="skeleton h-[86px]" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="skeleton h-[320px]" />
        <div className="skeleton h-[320px]" />
        <div className="skeleton h-[320px] hidden lg:block" />
      </div>
    </main>
  );
}
