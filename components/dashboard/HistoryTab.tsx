"use client";

import React from "react";
import {
  Card, Button, Divider, Chip,
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
} from "@heroui/react";
import { Trash2, History } from "lucide-react";
import { HistorySnapshot } from "@/types";
import { money } from "@/lib/format";
import type { NavTab } from "./BottomNav";

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
          <p className="text-xs text-default-400 mt-1">Registro de balances guardados</p>
        </div>
        {history.length > 0 && (
          <Button
            size="sm" color="danger" variant="light"
            startContent={<Trash2 size={14} />}
            onPress={onClearOpen}
          >
            Limpiar
          </Button>
        )}
      </div>

      <Card className="glass border-0">
        <div className="overflow-x-auto">
          <Table
            aria-label="Historial de balances"
            removeWrapper
            className="min-w-[500px]"
            selectionMode="none"
          >
            <TableHeader>
              <TableColumn className="text-xs font-bold uppercase tracking-wide">Fecha</TableColumn>
              <TableColumn className="text-xs font-bold uppercase tracking-wide text-right">Activos</TableColumn>
              <TableColumn className="text-xs font-bold uppercase tracking-wide text-right">Gastos</TableColumn>
              <TableColumn className="text-xs font-bold uppercase tracking-wide text-right">Apartados</TableColumn>
              <TableColumn className="text-xs font-bold uppercase tracking-wide text-right">Disponible</TableColumn>
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
                      <span className="ml-1.5 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-default-100 text-default-400">
                        auto
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="tnum text-emerald-600 dark:text-emerald-400 text-sm font-bold text-right">
                    {money(h.totalAssets)}
                  </TableCell>
                  <TableCell className="tnum text-rose-600 dark:text-rose-400 text-sm font-bold text-right">
                    −{money(h.totalLiabilities)}
                  </TableCell>
                  <TableCell className="tnum text-amber-600 dark:text-amber-400 text-sm font-bold text-right">
                    −{money(h.totalBuckets)}
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
