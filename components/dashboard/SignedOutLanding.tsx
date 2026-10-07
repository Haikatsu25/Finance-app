"use client";

import { Button } from "@heroui/react";
import { SignInButton } from "@clerk/nextjs";
import { ChevronRight } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export function SignedOutLanding() {
  return (
    <div className="min-h-[90dvh] max-w-xl mx-auto flex flex-col justify-center px-6 py-10">
      <div>
        <Logo size={72} className="mb-8" />
        <h1 className="figure text-[3.25rem] sm:text-[5.5rem] leading-[1] mb-5">
          Finance Control
        </h1>
        <p className="text-lg text-default-600 mb-2 max-w-md">
          Controla tus tarjetas, gastos y apartados, y pregúntale a la IA cómo vas.
        </p>
        <p className="text-sm text-default-500 mb-10 max-w-sm">
          Incluye meses sin intereses, recordatorios de pago y cuentas compartidas.
        </p>
        <SignInButton mode="modal">
          <Button
            size="lg" radius="full"
            color="primary"
            className="font-bold"
          >
            Iniciar sesión
            <ChevronRight size={18} aria-hidden />
          </Button>
        </SignInButton>
      </div>

      <a href="/privacidad" className="mt-8 text-xs text-default-500 hover:text-foreground underline underline-offset-2">
        Aviso de privacidad
      </a>
    </div>
  );
}
