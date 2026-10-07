"use client";

import {
  Card, Button, Divider, Chip,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
} from "@heroui/react";
import { Trash2, History } from "lucide-react";
import { HistorySnapshot } from "@/types";
import { money } from "@/lib/format";
import type { NavTab } from "./BottomNav";

/** Cero no es ni entrada ni salida: va en tinta y sin signo. */
function Amount({ value, tone, sign = "" }: { value: number; tone: string; sign?: string }) {
  const zero = Math.abs(value) < 0.005;
  return <span className={zero ? "text-foreground" : tone}>{zero ? money(0) : `${sign}${money(value)}`}</span>;
}

export function HistoryTab({ activeTab, history, onClearOpen, onOpenDetails }: {
  activeTab: NavTab;
  history: HistorySnapshot[];
  onClearOpen: () => void;
  onOpenDetails: (snapshot: HistorySnapshot) => void;
}) {
  return (
    <section id="history-section" className={activeTab !== "history" ? "hidden" : ""}>
      <Divider className="my-2" />
      <div className="flex justify-between items-end mb-4">
        <div>
          <h3 className="text-xl font-bold section-title">Historial</h3>
          <p className="text-xs text-default-600 mt-1">Registro de balances guardados</p>
        </div>
        {history.length > 0 && (
          <Button
            color="danger" variant="light" className="h-11 font-semibold"
            startContent={<Trash2 size={16} />}
            onPress={onClearOpen}
          >
            Limpiar
          </Button>
        )}
      </div>

      <Card className="glass shadow-none">
        <div className="overflow-x-auto">
          <Table
            aria-label="Historial de balances"
            removeWrapper
            className="min-w-[500px]"
            selectionMode="none"
          >
            <TableHeader>
              <TableColumn className="text-xs font-bold">Fecha</TableColumn>
              <TableColumn className="text-xs font-bold text-right">Activos</TableColumn>
              <TableColumn className="text-xs font-bold text-right">Gastos</TableColumn>
              <TableColumn className="text-xs font-bold text-right">Apartados</TableColumn>
              <TableColumn className="text-xs font-bold text-right">Disponible</TableColumn>
            </TableHeader>
            <TableBody emptyContent={
              <div className="py-12 text-center text-default-400">
                <History size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Aún no hay historial guardado</p>
                <p className="text-xs mt-1">Presiona &quot;Guardar Snapshot&quot; para registrar tu balance actual</p>
              </div>
            }>
              {history.map((h) => (
                <TableRow
                  key={h.id}
                  className="cursor-pointer hover:bg-default-50 transition-colors border-b border-divider last:border-none"
                  onClick={() => onOpenDetails(h)}
                >
                  <TableCell className="font-medium text-xs py-3">
                    {new Date(h.date).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" })}
                    {h.auto && (
                      <span className="ml-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-default-100 text-default-700">
                        auto
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="tnum text-sm font-bold text-right">
                    <Amount value={h.totalAssets} tone="text-money-in-text" />
                  </TableCell>
                  <TableCell className="tnum text-sm font-bold text-right">
                    <Amount value={h.totalLiabilities} tone="text-money-out-text" sign="−" />
                  </TableCell>
                  <TableCell className="tnum text-sm font-bold text-right">
                    <Amount value={h.totalBuckets} tone="text-money-hold-text" sign="−" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Chip
                      color={h.available >= 0 ? "success" : "danger"}
                      variant="flat"
                      size="sm"
                      className="font-bold tnum"
                    >
                      {money(h.available)}
                    </Chip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </section>
  );
}
