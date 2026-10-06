"use client";

import React from "react";
import { Card, CardBody, Button } from "@heroui/react";
import { Repeat, Check } from "lucide-react";
import { SubscriptionItem } from "@/types";
import { money } from "@/lib/format";
import { monthLabel } from "@/lib/finance-utils";

export function PendingFixedChargesCard({ pendingFixed, pendingFixedTotal, currentMonthKey, onDismiss, onRegister }: {
  pendingFixed: SubscriptionItem[];
  pendingFixedTotal: number;
  currentMonthKey: string;
  onDismiss: () => void;
  onRegister: () => void;
}) {
  return (
    <Card className="glass border border-indigo-500/25 animate-fade-in-up">
      <CardBody className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="p-2.5 rounded-xl bg-indigo-500/12 w-fit shrink-0">
          <Repeat size={18} className="text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">
            ¿Registro tus gastos fijos de <span className="capitalize">{monthLabel(currentMonthKey).split(" ")[0]}</span>?
          </p>
          <p className="text-xs text-default-400 truncate">
            {pendingFixed.map((s) => s.label).join(" · ")} — total{" "}
            <span className="font-bold tnum text-default-600">{money(pendingFixedTotal)}</span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="light" className="text-default-400" onPress={onDismiss}>
            Este mes no
          </Button>
          <Button
            size="sm" variant="shadow" className="font-bold bg-indigo-500 text-white"
            startContent={<Check size={14} />}
            onPress={onRegister}
          >
            Registrar {pendingFixed.length}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
