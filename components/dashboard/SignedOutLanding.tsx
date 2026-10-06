"use client";

import React from "react";
import { Button } from "@heroui/react";
import { SignInButton } from "@clerk/nextjs";
import { Wallet, ChevronRight } from "lucide-react";

export function SignedOutLanding() {
  return (
    <div className="min-h-[90dvh] flex flex-col items-center justify-center p-6 text-center">
      <div className="animate-fade-in-up">
        <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-blue-500 to-sky-400 shadow-2xl shadow-blue-500/40 mb-8">
          <Wallet className="text-white w-14 h-14" />
        </div>
        <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tight gradient-text-emerald">
          Finance Control
        </h1>
        <p className="text-lg text-default-500 mb-2 max-w-md mx-auto">
          Gestión financiera personal con{" "}
          <span className="font-bold text-indigo-500">Inteligencia Artificial</span>
        </p>
        <p className="text-sm text-default-400 mb-10 max-w-sm mx-auto">
          Activos · Pasivos · Apartados · Predicción Neural
        </p>
        <SignInButton mode="modal">
          <Button
            size="lg"
            className="font-bold bg-gradient-to-r from-blue-500 to-sky-400 text-white shadow-xl shadow-blue-500/40 hover:shadow-emerald-500/60 transition-shadow"
          >
            Iniciar Sesión
            <ChevronRight size={18} />
          </Button>
        </SignInButton>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mt-12 animate-fade-in-up delay-300">
        {["📊 Analíticas avanzadas", "🧠 Asistente IA", "📱 Móvil amigable", "🔒 Datos seguros"].map((f) => (
          <span key={f} className="glass px-4 py-2 rounded-full text-xs font-medium text-default-600">{f}</span>
        ))}
      </div>

      <a href="/privacidad" className="mt-8 text-[11px] text-default-400 hover:text-sky-500 underline underline-offset-2">
        Aviso de privacidad
      </a>
    </div>
  );
}
