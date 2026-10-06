"use client";

import { Card, CardBody } from "@heroui/react";
import { CalendarClock, CreditCard as CreditCardIcon, Repeat, AlertTriangle } from "lucide-react";
import { CreditCardItem, SubscriptionItem, InstallmentPlan } from "@/types";
import { money } from "@/lib/format";
import { upcomingPayments, UpcomingPayment } from "@/lib/finance-utils";

// Vencido y urgente: bloque relleno. Pronto: contorno de 2px. El resto: sin énfasis.
// El color queda libre para significar dinero.
const URGENCY_CLS: Record<UpcomingPayment["urgency"], { box: string; muted: string; alert: boolean }> = {
  overdue: { box: "bg-foreground text-background border-foreground", muted: "text-background", alert: true },
  urgent:  { box: "bg-foreground text-background border-foreground", muted: "text-background", alert: true },
  soon:    { box: "border-2 border-foreground", muted: "text-default-600", alert: false },
  ok:      { box: "border border-default-300", muted: "text-default-600", alert: false },
};

function leftLabel(p: UpcomingPayment): string {
  if (p.daysLeft < 0) return `venció hace ${Math.abs(p.daysLeft)} ${Math.abs(p.daysLeft) === 1 ? "día" : "días"}`;
  if (p.daysLeft === 0) return "hoy";
  if (p.daysLeft === 1) return "mañana";
  return `en ${p.daysLeft} días`;
}

export default function UpcomingPayments({ cards, subscriptions, installments = [] }: {
  cards: CreditCardItem[];
  subscriptions: SubscriptionItem[];
  installments?: InstallmentPlan[];
}) {
  const payments = upcomingPayments(cards, subscriptions, 30, installments);
  if (payments.length === 0) return null;

  const urgent = payments.filter((p) => p.urgency === "overdue" || p.urgency === "urgent").length;

  return (
    <Card className="glass card-hover rule-out shadow-none">
      <CardBody className="p-5">
        <div className="mb-3">
          <h3 className="text-sm font-bold tracking-tight flex items-center gap-2">
            <CalendarClock size={16} className="text-money-out-text" aria-hidden />
            Por pagar
          </h3>
          <p className="text-xs text-default-500 mt-0.5">
            Próximos 30 días{urgent > 0 && <>, <span className="text-money-out-text font-bold">{urgent} urgente{urgent > 1 ? "s" : ""}</span></>}
          </p>
        </div>

        <div
          className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1"
          role="region" aria-label="Pagos de los próximos 30 días" tabIndex={0}
        >
          {payments.map((p) => {
            const u = URGENCY_CLS[p.urgency];
            return (
              <div
                key={p.id}
                className={`shrink-0 min-w-[172px] p-3 rounded-lg ${u.box}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {u.alert
                    ? <AlertTriangle size={13} aria-label="Urgente" />
                    : p.kind === "card"
                      ? <CreditCardIcon size={13} className="text-default-500" aria-hidden />
                      : <Repeat size={13} className="text-default-500" aria-hidden />}
                  <span className="text-sm font-bold truncate max-w-[120px]">{p.label}</span>
                </div>
                <p className="figure text-[1.75rem]">{money(p.amount)}</p>
                {p.note && <p className={`text-xs ${u.muted}`}>{p.note}</p>}
                <p className={`text-xs font-semibold ${u.muted}`}>
                  {p.dueDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}, {leftLabel(p)}
                </p>
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
