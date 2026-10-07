"use client";

import { Trash2 } from "lucide-react";
import { HistorySnapshot } from "@/types";
import { money } from "@/lib/format";

/** Cero no es ni entrada ni salida: va en tinta y sin signo. */
function Amount({ value, tone, sign = "" }: { value: number; tone: string; sign?: string }) {
  const zero = Math.abs(value) < 0.005;
  return <span className={zero ? "text-foreground" : tone}>{zero ? money(0) : `${sign}${money(value)}`}</span>;
}

export function HistoryTab({ history, onClearOpen, onOpenDetails, onSaveSnapshot }: {
  history: HistorySnapshot[];
  onClearOpen: () => void;
  onOpenDetails: (snapshot: HistorySnapshot) => void;
  onSaveSnapshot: () => void;
}) {
  return (
    <>
      <div className="wide flex items-center justify-between gap-2 px-0.5">
        <h2 className="sec sec-lg">Historial</h2>
        {history.length > 0 && (
          <button type="button" className="btn ghost sm" onClick={onClearOpen}>
            <Trash2 size={16} aria-hidden /> Limpiar
          </button>
        )}
      </div>

      <section id="history-section" className="pop-card wide">
        <p className="summary">
          Registro de balances guardados. Cada snapshot es una foto de activos, deudas y apartados en esa fecha.
        </p>

        {history.length > 0 ? (
          <div className="tblwrap">
            <table className="tbl" aria-label="Historial de balances">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Activos</th>
                  <th scope="col">Gastos</th>
                  <th scope="col">Apartados</th>
                  <th scope="col">Disponible</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr
                    key={h.id}
                    tabIndex={0}
                    onClick={() => onOpenDetails(h)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpenDetails(h); } }}
                  >
                    <td>
                      {new Date(h.date).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" })}
                      {h.auto && <span className="pill ok ml-1.5">auto</span>}
                    </td>
                    <td className="num"><Amount value={h.totalAssets} tone="text-money-in-text" /></td>
                    <td className="num"><Amount value={h.totalLiabilities} tone="text-money-out-text" sign="−" /></td>
                    <td className="num"><Amount value={h.totalBuckets} tone="text-money-hold-text" sign="−" /></td>
                    <td className="num"><b className={h.available < 0 ? "text-money-out-text" : ""}>{money(h.available)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            Aún no hay historial. Toca «Guardar snapshot» para registrar tu balance actual.
          </div>
        )}

        <div className="mt-3">
          <button type="button" className="btn" onClick={onSaveSnapshot}>Guardar snapshot de hoy</button>
        </div>
      </section>
    </>
  );
}
