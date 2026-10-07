"use client";

import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Mic, Eye, EyeOff, CircleHelp, Settings } from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { SaveIndicator, type SaveStatus } from "./SaveIndicator";

function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

/** Saludo con avatar, y a la derecha los atajos. Reemplaza al logo de la barra superior. */
export function TopNav({ saveStatus, privacy, onTogglePrivacy, onVoiceOpen, onStartTour, onOpenSettings }: {
  saveStatus: SaveStatus;
  privacy: boolean;
  onTogglePrivacy: () => void;
  onVoiceOpen: () => void;
  onStartTour: () => void;
  onOpenSettings: () => void;
}) {
  const { user } = useUser();
  const name = user?.firstName || user?.username || "";

  return (
    <header className="top">
      <div className="greet">
        <SignedIn>
          <div className="av" aria-hidden>{(name || "R").charAt(0).toUpperCase()}</div>
          <div>
            <small>{greeting()}</small>
            <b>{name || "Hola"}</b>
          </div>
        </SignedIn>
        <SignedOut>
          <div>
            <b>Finance Control</b>
          </div>
        </SignedOut>
      </div>

      <div className="icons">
        <SaveIndicator status={saveStatus} />
        <SignedIn>
          <button type="button" className="top-icon max-sm:hidden" onClick={onVoiceOpen} aria-label="Asistente de voz">
            <Mic size={18} aria-hidden />
          </button>
          <button
            type="button" className="top-icon" onClick={onTogglePrivacy}
            aria-pressed={privacy} aria-label={privacy ? "Mostrar montos" : "Ocultar montos"}
          >
            {privacy ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
          </button>
        </SignedIn>
        <button type="button" className="top-icon max-sm:hidden" onClick={onStartTour} aria-label="Iniciar tour">
          <CircleHelp size={18} aria-hidden />
        </button>
        <ThemeSwitcher />
        <SignedIn>
          <button type="button" className="top-icon" onClick={onOpenSettings} aria-label="Ajustes">
            <Settings size={18} aria-hidden />
          </button>
          <span className="max-sm:hidden grid place-items-center size-11"><UserButton appearance={{ elements: { userButtonTrigger: "min-h-9 min-w-9 rounded-full", userButtonAvatarBox: "size-8" } }} /></span>
        </SignedIn>
      </div>
    </header>
  );
}
