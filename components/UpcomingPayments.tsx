"use client";

import { CreditCard as CreditCardIcon, Repeat } from "lucide-react";
import { CreditCardItem, SubscriptionItem, InstallmentPlan } from "@/types";
import { money } from "@/lib/format";
import { upcomingPayments, UpcomingPayment } from "@/lib/finance-utils";

// Vencido: píldora roja sólida. Hoy o en 3 días o menos: píldora ámbar suave. El resto: gris con la fecha.
function pillFor(p: UpcomingPayment) {
  const d = p.daysLeft;
  if (p.urgency === "overdue" || d < 0) {
    const n = Math.abs(d);
    return { cls: "urg", text: `Venció hace ${n} ${n === 1 ? "día" : "días"}` };
  }
  if (d <= 3) return { cls: "soon", text: d === 0 ? "Hoy" : d === 1 ? "Mañana" : `En ${d} días` };
  return {
    cls: "ok",
    text: `${p.dueDate.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}, en ${d} días`,
  };
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
    <section className="pop-card" aria-label="Pagos de los próximos 30 días">
      <div className="sec-h">
        <h2 className="sec">Por pagar</h2>
        <span className="chip">
          Próximos 30 días{urgent > 0 && `, ${urgent} urgente${urgent > 1 ? "s" : ""}`}
        </span>
      </div>

      <div className="list">
        {payments.map((p) => {
          const pill = pillFor(p);
          return (
            <div key={p.id} className="it">
              <i aria-hidden>{p.kind === "card" ? <CreditCardIcon size={18} /> : <Repeat size={18} />}</i>
              <div className="t">
                <b>
                  {p.label}
                  {p.note && <span className="mute text-[0.6875rem] font-semibold"> {p.note}</span>}
                </b>
                <small><span className={`pill ${pill.cls}`}>{pill.text}</span></small>
              </div>
              <div className="amt">{money(p.amount)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
