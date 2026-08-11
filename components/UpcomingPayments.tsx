"use client";

import React from "react";
import { Card, CardBody } from "@heroui/react";
import { CalendarClock, CreditCard as CreditCardIcon, Repeat } from "lucide-react";
import { CreditCardItem, SubscriptionItem } from "@/types";
import { money } from "@/lib/format";
import { upcomingPayments, UpcomingPayment } from "@/lib/finance-utils";

const URGENCY_CLS: Record<UpcomingPayment["urgency"], { dot: string; text: string; chip: string }> = {
  overdue: { dot: "bg-rose-500",    text: "text-rose-500",    chip: "bg-rose-500/12 border-rose-500/25" },
  urgent:  { dot: "bg-rose-500",    text: "text-rose-500",    chip: "bg-rose-500/12 border-rose-500/25" },
  soon:    { dot: "bg-amber-500",   text: "text-amber-500",   chip: "bg-amber-500/12 border-amber-500/25" },
  ok:      { dot: "bg-emerald-500", text: "text-default-500", chip: "bg-default-100/60 border-default-200/60" },
};

function leftLabel(p: UpcomingPayment): string {
  if (p.daysLeft < 0) return `venció hace ${Math.abs(p.daysLeft)}d`;
  if (p.daysLeft === 0) return "HOY";
  if (p.daysLeft === 1) return "mañana";
  return `en ${p.daysLeft} días`;
}

export default function UpcomingPayments({ cards, subscriptions }: {
  cards: CreditCardItem[];
  subscriptions: SubscriptionItem[];
}) {
  const payments = upcomingPayments(cards, subscriptions, 30);
  if (payments.length === 0) return null;

  const urgent = payments.filter((p) => p.urgency === "overdue" || p.urgency === "urgent").length;

  return (
    <Card className="glass card-hover border border-amber-500/20 animate-fade-in-up">
      <CardBody className="p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 rounded-xl bg-amber-500/12">
            <CalendarClock size={16} className="text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">Por pagar</h3>
            <p className="text-[11px] text-default-400">
              Próximos 30 días{urgent > 0 && <span className="text-rose-500 font-bold"> · {urgent} urgente{urgent > 1 ? "s" : ""}</span>}
            </p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {payments.map((p) => {
            const u = URGENCY_CLS[p.urgency];
            return (
              <div
                key={p.id}
                className={`shrink-0 min-w-[160px] p-3 rounded-xl border ${u.chip} animate-fade-in-scale`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${u.dot}`} />
                  {p.kind === "card"
                    ? <CreditCardIcon size={11} className="text-default-400" />
                    : <Repeat size={11} className="text-default-400" />}
                  <span className="text-xs font-bold text-default-700 truncate max-w-[100px]">{p.label}</span>
                </div>
                <p className="text-base font-black tnum">{money(p.amount)}</p>
                <p className={`text-[10px] font-semibold ${u.text}`}>
                  {p.dueDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} · {leftLabel(p)}
                </p>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
