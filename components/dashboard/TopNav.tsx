"use client";

import React from "react";
import { Button } from "@heroui/react";
import { SignedIn, UserButton } from "@clerk/nextjs";
import {
  Wallet, LayoutDashboard, ReceiptText, BarChart2, Brain, History,
  Mic, Eye, EyeOff, HelpCircle,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { SaveIndicator, type SaveStatus } from "./SaveIndicator";
import type { NavTab } from "./BottomNav";

export function TopNav({ activeTab, onChangeTab, saveStatus, privacy, onTogglePrivacy, onVoiceOpen, onStartTour }: {
  activeTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
  saveStatus: SaveStatus;
  privacy: boolean;
  onTogglePrivacy: () => void;
  onVoiceOpen: () => void;
  onStartTour: () => void;
}) {
  return (
    <nav className="glass-nav w-full sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <div className="p-2 rounded-lg bg-ink shrink-0">
            <Wallet className="text-cal w-5 h-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight truncate whitespace-nowrap">
              Finance Control
            </h1>
            <p className="text-[11px] text-default-500 -mt-0.5 hidden sm:block truncate">
              Gestión financiera inteligente
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-stretch gap-1 self-stretch">
          {([
            { id: "dashboard",    icon: <LayoutDashboard size={15} />, label: "Inicio" },
            { id: "transactions", icon: <ReceiptText size={15} />,     label: "Movimientos" },
            { id: "analytics",    icon: <BarChart2 size={15} />,       label: "Análisis" },
            { id: "ai",           icon: <Brain size={15} />,            label: "FinanceAI" },
            { id: "history",      icon: <History size={15} />,          label: "Historial" },
          ] as { id: NavTab; icon: React.ReactNode; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={`flex items-center gap-1.5 px-3 border-b-[3px] text-[13px] transition-colors ${
                activeTab === tab.id
                  ? "border-foreground text-foreground font-bold"
                  : "border-transparent text-default-500 font-semibold hover:text-foreground"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
          <SaveIndicator status={saveStatus} />
          <SignedIn>
            <Button
              isIconOnly variant="light" size="sm"
              onPress={onVoiceOpen}
              className="text-default-500 hover:text-foreground"
              aria-label="Asistente de voz"
            >
              <Mic size={18} />
            </Button>
            <Button
              isIconOnly variant="light" size="sm"
              onPress={onTogglePrivacy}
              className="text-default-500 hover:text-foreground"
              aria-label={privacy ? "Mostrar montos" : "Ocultar montos"}
            >
              {privacy ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>
          </SignedIn>
          <Button
            isIconOnly variant="light" size="sm"
            onPress={onStartTour}
            className="text-default-500 hover:text-foreground"
            aria-label="Iniciar tour"
          >
            <HelpCircle size={18} />
          </Button>
          <ThemeSwitcher />
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}
