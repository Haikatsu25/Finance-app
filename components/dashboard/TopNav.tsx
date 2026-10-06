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
    <nav className="glass-nav w-full sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-sky-400 shadow-md shadow-blue-500/25 shrink-0">
            <Wallet className="text-white w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight gradient-text-emerald truncate whitespace-nowrap">
              Finance Control
            </h1>
            <p className="text-[10px] text-default-400 -mt-0.5 hidden sm:block truncate">
              Gestión financiera inteligente
            </p>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 bg-default-100/70 rounded-xl p-1">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-white dark:bg-default-100 text-blue-600 dark:text-sky-400 shadow-sm"
                  : "text-default-500 hover:text-default-700"
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
              className="text-default-400 hover:text-sky-500"
              aria-label="Asistente de voz"
            >
              <Mic size={18} />
            </Button>
            <Button
              isIconOnly variant="light" size="sm"
              onPress={onTogglePrivacy}
              className="text-default-400 hover:text-sky-500"
              aria-label={privacy ? "Mostrar montos" : "Ocultar montos"}
            >
              {privacy ? <EyeOff size={18} /> : <Eye size={18} />}
            </Button>
          </SignedIn>
          <Button
            isIconOnly variant="light" size="sm"
            onPress={onStartTour}
            className="text-default-400 hover:text-sky-500"
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
