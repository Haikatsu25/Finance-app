"use client";

import { monthLabel } from "@/lib/finance-utils";

export function HomeViewToggle({ planMode, setPlanMode, planMonthKey }: {
  planMode: boolean;
  setPlanMode: (planMode: boolean) => void;
  planMonthKey: string;
}) {
  return (
    <div className="flex justify-start relative z-10">
      <div className="inline-flex items-stretch rounded-[10px] border-2 border-foreground overflow-hidden" role="tablist" aria-label="Vista de Inicio">
        <button
          role="tab" aria-selected={!planMode}
          onClick={() => setPlanMode(false)}
          className={`px-4 min-h-10 text-[13px] font-bold transition-colors ${!planMode ? "bg-foreground text-background" : "text-foreground hover:bg-foreground/10"}`}
        >
          Este mes
        </button>
        <button
          role="tab" aria-selected={planMode}
          onClick={() => setPlanMode(true)}
          className={`px-4 min-h-10 text-[13px] font-bold transition-colors flex items-center gap-1 ${planMode ? "bg-foreground text-background" : "text-foreground hover:bg-foreground/10"}`}
        >
          Plan <span className="capitalize">{monthLabel(planMonthKey).split(" de ")[0]}</span> ›
        </button>
      </div>
    </div>
  );
}
