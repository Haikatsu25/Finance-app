"use client";

import { Calendar as CalendarWidget } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { Sheet } from "@/components/ui/Sheet";
import { FinanceItem, HistorySnapshot } from "@/types";
import { money } from "@/lib/format";
import { localDay } from "@/lib/finance-utils";

export function SnapshotModal({ isOpen, onOpenChange, selectedSnapshot }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSnapshot: HistorySnapshot | null;
}) {
  const s = selectedSnapshot;
  const groups = s
    ? [
        { label: "Activos",   items: s.assets,      total: s.totalAssets,      tone: "text-money-in-text" },
        { label: "Deudas",    items: s.liabilities, total: s.totalLiabilities, tone: "text-money-out-text" },
        { label: "Apartados", items: s.buckets,     total: s.totalBuckets,     tone: "text-money-hold-text" },
      ]
    : [];

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange} title="Detalles del snapshot" wide>
      {s && (
        <>
          <p className="mute text-sm font-semibold -mt-2">
            {new Date(s.date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>

          <div className="three">
            {groups.map((g) => (
              <div key={g.label}>
                <small>{g.label}</small>
                <b className={g.tone}>{money(g.total)}</b>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <CalendarWidget
              aria-label="Fecha del snapshot"
              value={parseDate(localDay(s.date))}
              isReadOnly
              className="shadow-none"
            />
          </div>

          {groups.map((g) => (
            <div key={g.label}>
              <h3 className={`text-sm font-extrabold mb-2 ${g.tone}`}>{g.label}</h3>
              {g.items?.length ? (
                <div className="list">
                  {g.items.map((item: FinanceItem, idx: number) => (
                    <div key={idx} className="it">
                      <div className="t">
                        <b>{item.label}</b>
                        <small>{item.category}</small>
                      </div>
                      <div className={`amt ${g.tone}`}>{money(item.amount)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mute text-xs italic">No disponible</p>
              )}
            </div>
          ))}
        </>
      )}
      <div className="ft">
        <button type="button" className="btn" onClick={() => onOpenChange(false)}>Cerrar</button>
      </div>
    </Sheet>
  );
}
