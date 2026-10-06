"use client";

import { Button } from "@heroui/react";
import { Fingerprint, Lock } from "lucide-react";

export function BiometricLockScreen({ unlocking, onUnlock }: {
  unlocking: boolean;
  onUnlock: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] hero-card flex flex-col items-center justify-center gap-6 p-6 overflow-hidden overscroll-none touch-none">
      <div className="p-5 rounded-3xl bg-white/5 border border-white/15">
        <Fingerprint size={44} className="text-cal" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-black text-white mb-1">Finance Control está bloqueada</h2>
        <p className="text-sm text-white/50">Usa tu huella o rostro para entrar</p>
      </div>
      <Button
        size="lg"
        className="bg-white text-black font-bold px-8"
        startContent={<Lock size={17} />}
        isLoading={unlocking}
        onPress={onUnlock}
      >
        Desbloquear
      </Button>
      <p className="text-[11px] text-white/30 max-w-[260px] text-center">
        Si tu huella no funciona, desbloquea con el método de tu dispositivo (PIN/patrón) cuando el sistema lo ofrezca.
      </p>
    </div>
  );
}
