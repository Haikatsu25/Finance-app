"use client";

import React from "react";
import { monthLabel } from "@/lib/finance-utils";

export function HomeViewToggle({ planMode, setPlanMode, planMonthKey }: {
  planMode: boolean;
  setPlanMode: (planMode: boolean) => void;
  planMonthKey: string;
}) {
  return (
    <div className="flex justify-center relative z-10">
      <div className="inline-flex items-center gap-1 bg-default-100/70 rounded-xl p-1 shadow-sm" role="tablist" aria-label="Vista de Inicio">
        <button
          role="tab" aria-selected={!planMode}
          onClick={() => setPlanMode(false)}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${!planMode ? "bg-white dark:bg-default-100 text-blue-600 dark:text-sky-400 shadow-sm" : "text-default-500 hover:text-default-700"}`}
        >
          Este mes
        </button>
        <button
          role="tab" aria-selected={planMode}
          onClick={() => setPlanMode(true)}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${planMode ? "bg-white dark:bg-default-100 text-blue-600 dark:text-sky-400 shadow-sm" : "text-default-500 hover:text-default-700"}`}
        >
          Plan <span className="capitalize">{monthLabel(planMonthKey).split(" de ")[0]}</span> ›
        </button>
      </div>
    </div>
  );
}
