"use client";

import { Sparkles } from "lucide-react";

export function WelcomeCard({ onLoadDemo, onDismiss }: {
  onLoadDemo: () => void;
  onDismiss: () => void;
}) {
  return (
    <section className="hero-slab wide animate-fade-in-up">
      <div className="text-center py-2">
        <div className="inline-grid place-items-center size-12 rounded-full bg-white/15 mb-3">
          <Sparkles size={22} aria-hidden />
        </div>
        <h2 className="text-xl font-extrabold mb-1">Bienvenido a Finance Control</h2>
        <p className="text-sm text-(--hero-mute) max-w-md mx-auto mb-4">
          Empieza registrando tu primera cuenta o tarjeta, o explora la app ya llena
          con datos de ejemplo que puedes borrar cuando quieras.
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <button type="button" className="slab-btn" data-solid="true" onClick={onLoadDemo}>
            Cargar datos de ejemplo
          </button>
          <button type="button" className="slab-btn" onClick={onDismiss}>
            Empezar desde cero
          </button>
        </div>
      </div>
    </section>
  );
}
