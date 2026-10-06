"use client";

import { Card, CardBody, Button } from "@heroui/react";
import { Wand2 } from "lucide-react";

export function WelcomeCard({ onLoadDemo, onDismiss }: {
  onLoadDemo: () => void;
  onDismiss: () => void;
}) {
  return (
    <Card className="hero-card glow-hero-positive border-0 overflow-hidden relative animate-fade-in-up">
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full border border-white/10" />
      <CardBody className="relative z-10 p-6 text-center">
        <div className="inline-flex p-3 rounded-2xl bg-white/10 border border-white/15 mb-3">
          <Wand2 size={22} className="text-sky-400" />
        </div>
        <h3 className="text-lg font-black text-white mb-1">¡Bienvenido a Finance Control!</h3>
        <p className="text-sm text-white/60 max-w-md mx-auto mb-4">
          Empieza registrando tu primera cuenta o tarjeta — o explora la app ya llena
          con datos de ejemplo que puedes borrar cuando quieras.
        </p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Button size="sm" className="bg-white text-black font-bold" startContent={<Wand2 size={14} />} onPress={onLoadDemo}>
            Cargar datos de ejemplo
          </Button>
          <Button size="sm" variant="light" className="text-white/60 hover:text-white" onPress={onDismiss}>
            Empezar desde cero
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
