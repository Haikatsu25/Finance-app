"use client";

import { monthLabel } from "@/lib/finance-utils";

export function HomeViewToggle({ planMode, setPlanMode, planMonthKey }: {
  planMode: boolean;
  setPlanMode: (planMode: boolean) => void;
  planMonthKey: string;
}) {
  return (
    <div className="wide flex justify-start">
      <div className="seg" role="group" aria-label="Vista de Inicio">
        <button type="button" aria-pressed={!planMode} onClick={() => setPlanMode(false)}>
          Este mes
        </button>
        <button type="button" aria-pressed={planMode} onClick={() => setPlanMode(true)}>
          Plan <span className="capitalize">{monthLabel(planMonthKey).split(" de ")[0]}</span> ›
        </button>
      </div>
    </div>
  );
}
