"use client";

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Card, CardBody, Divider, Button, Calendar as CalendarWidget } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { DollarSign, ShieldAlert, Wallet } from "lucide-react";
import { FinanceItem, HistorySnapshot } from "@/types";
import { money } from "@/lib/format";
import { localDay } from "@/lib/finance-utils";
import { TONE } from "./tone";

export function SnapshotModal({ isOpen, onOpenChange, selectedSnapshot }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSnapshot: HistorySnapshot | null;
}) {
  const historyTone = [
    { label: "Activos",   tone: TONE.emerald, icon: <DollarSign size={20} /> },
    { label: "Deudas",    tone: TONE.rose,    icon: <ShieldAlert size={20} /> },
    { label: "Apartados", tone: TONE.amber,   icon: <Wallet size={20} /> },
  ];

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="3xl" scrollBehavior="inside" backdrop="blur">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              <span className="font-extrabold">Detalles del snapshot</span>
              <span className="text-small font-normal text-default-400">
                {selectedSnapshot &&
                  new Date(selectedSnapshot.date).toLocaleDateString("es-MX", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                  })}
              </span>
            </ModalHeader>
            <ModalBody>
              {selectedSnapshot && (
                <div className="space-y-5">
                  <div className="flex flex-col md:flex-row gap-5">
                    <div className="flex justify-center">
                      <CalendarWidget
                        aria-label="Fecha del snapshot"
                        value={parseDate(localDay(selectedSnapshot.date))}
                        isReadOnly
                        className="border border-default-200 rounded-lg"
                      />
                    </div>
                    <div className="flex-grow grid grid-cols-1 gap-3 content-center">
                      {[
                        { ...historyTone[0], value: selectedSnapshot.totalAssets },
                        { ...historyTone[1], value: selectedSnapshot.totalLiabilities },
                        { ...historyTone[2], value: selectedSnapshot.totalBuckets },
                      ].map(({ label, value, tone, icon }) => (
                        <Card key={label} className={`${tone.bg} border ${tone.border} shadow-none`}>
                          <CardBody className="py-3 px-4 flex flex-row items-center justify-between">
                            <div>
                              <p className={`text-xs font-bold ${tone.text}`}>{label}</p>
                              <p className={`text-xl font-extrabold tnum ${tone.textStrong}`}>
                                {money(value)}
                              </p>
                            </div>
                            <div className={`p-2 ${tone.iconBg} rounded-xl ${tone.text}`}>{icon}</div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Divider />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: "Activos",   items: selectedSnapshot.assets,      tone: TONE.emerald },
                      { label: "Deudas",    items: selectedSnapshot.liabilities, tone: TONE.rose },
                      { label: "Apartados", items: selectedSnapshot.buckets,     tone: TONE.amber },
                    ].map(({ label, items, tone }) => (
                      <div key={label}>
                        <h4 className={`font-bold text-sm mb-2 ${tone.text}`}>{label}</h4>
                        <div className="space-y-1.5">
                          {items?.length ? items.map((item: FinanceItem, idx: number) => (
                            <div key={idx} className={`flex items-center gap-2 p-2 rounded-xl ${tone.bg} border ${tone.border}`}>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-default-700 truncate">{item.label}</p>
                                <p className="text-[10px] text-default-400">{item.category}</p>
                              </div>
                              <span className={`ml-auto tnum text-xs font-bold ${tone.text}`}>
                                {money(item.amount)}
                              </span>
                            </div>
                          )) : <p className="text-xs text-default-400 italic">No disponible</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" className="h-11 font-semibold" onPress={onClose}>Cerrar</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
