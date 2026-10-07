"use client";

import { useEffect, useMemo, useState } from "react";
import { Slider } from "@heroui/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingDown, Clock, Flame } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { useChartColors } from "@/components/ui/useChartColors";
import { CreditCardItem } from "@/types";
import { money, moneyExact } from "@/lib/format";
import { amortize } from "@/lib/finance-utils";

export default function DebtSimulator({ card, onClose }: {
  card: CreditCardItem | null;
  onClose: () => void;
}) {
  const c = useChartColors();
  const [payment, setPayment] = useState<number>(0);
  const [aprInput, setAprInput] = useState<string>("");

  // Al abrir con una tarjeta nueva, proponer un pago inicial razonable
  const cardId = card?.id;
  useEffect(() => {
    if (card) {
      setPayment(Math.max(100, Math.round(card.balance * 0.1)));
      setAprInput(card.apr && card.apr > 0 ? String(card.apr) : "60");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  const apr = parseFloat(aprInput) || 0;

  const result = useMemo(() => {
    if (!card) return null;
    return amortize(card.balance, apr, payment);
  }, [card, apr, payment]);

  // Comparativa: ¿y si pago $500 más al mes?
  const better = useMemo(() => {
    if (!card) return null;
    return amortize(card.balance, apr, payment + 500);
  }, [card, apr, payment]);

  const never = result !== null && !Number.isFinite(result.months);
  const maxSlider = card ? Math.max(1000, Math.ceil(card.balance / 4 / 500) * 500) : 1000;
  const tick = { fontSize: 10, fontWeight: 600, fill: c.mute, fontFamily: "var(--font-jakarta), system-ui, sans-serif" };

  return (
    <Sheet open={card !== null} onOpenChange={(open) => { if (!open) onClose(); }} title={card ? `Simulador de deuda: ${card.label}` : "Simulador de deuda"} wide>
      {card && (
        <>
          <div className="three" style={{ gridTemplateColumns: "1fr" }}>
            <div>
              <small>Deuda de contado</small>
              <b style={{ fontSize: 28 }}>{money(card.balance)}</b>
            </div>
          </div>

          <div className="f">
            <label htmlFor="sim-apr">Tasa anual (%)</label>
            <input id="sim-apr" type="number" min="0" value={aprInput} onChange={(e) => setAprInput(e.target.value)} />
            <span className="mute text-xs">El CAT de tu tarjeta (60 a 120% es común en México)</span>
          </div>

          <div>
            <p className="text-xs mute mb-2">
              Pago mensual: <b className="text-base text-foreground tnum">{moneyExact(payment)}</b>
            </p>
            <Slider
              aria-label="Pago mensual"
              size="md"
              color="primary"
              minValue={0}
              maxValue={maxSlider}
              step={100}
              value={payment}
              onChange={(v) => setPayment(Array.isArray(v) ? v[0] : v)}
            />
          </div>

          {never ? (
            <div className="callout warn">
              <p className="font-bold text-money-out-text flex items-center gap-1.5">
                <Flame size={15} aria-hidden /> Con ese pago nunca terminas
              </p>
              <p className="text-xs mt-1">
                El interés mensual es {moneyExact(result!.minViablePayment)}. Cualquier pago menor
                o igual a eso solo alimenta al banco: la deuda no baja jamás.
              </p>
            </div>
          ) : result && (
            <div className="list">
              <div className="it">
                <i aria-hidden><Clock size={18} /></i>
                <div className="t">
                  <b style={{ fontSize: 20 }}>
                    {result.months} {result.months === 1 ? "mes" : "meses"}{" "}
                    <span className="mute text-xs font-medium">
                      ({Math.floor(result.months / 12) > 0 ? `${Math.floor(result.months / 12)}a ${result.months % 12}m` : "menos de un año"})
                    </span>
                  </b>
                  <small>para liquidar la deuda</small>
                </div>
              </div>
              <div className="it">
                <i aria-hidden style={{ background: "var(--money-out-soft)", color: "var(--money-out-text)" }}><Flame size={18} /></i>
                <div className="t">
                  <b className="text-money-out-text" style={{ fontSize: 20 }}>{money(result.totalInterest)}</b>
                  <small>pagarás solo de intereses</small>
                </div>
              </div>
              {better && Number.isFinite(better.months) && Number.isFinite(result.months) && better.months < result.months && (
                <div className="it">
                  <i aria-hidden><TrendingDown size={18} /></i>
                  <p className="text-xs leading-snug flex-1">
                    Con <b>$500 más al mes</b> terminas <b>{result.months - better.months} meses antes</b> y ahorras{" "}
                    <b className="text-money-in-text tnum">{money(result.totalInterest - better.totalInterest)}</b> en intereses.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Curva de amortización */}
          {result && Number.isFinite(result.months) && result.schedule.length > 1 && (
            <div className="chart-tokens h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={result.schedule} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradDebt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c.out} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={c.out} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={c.line} strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="month" tick={tick} axisLine={false} tickLine={false}
                    label={{ value: "meses", position: "insideBottomRight", fontSize: 10, fill: c.mute }} />
                  <YAxis tick={tick} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} width={44} />
                  <Tooltip
                    formatter={(v) => [moneyExact(Number(v)), "Saldo restante"]}
                    labelFormatter={(l) => `Mes ${l}`}
                    contentStyle={{ borderRadius: 16, fontSize: 12, background: c.card, border: `1px solid ${c.line}`, color: c.ink }}
                  />
                  <Area type="monotone" dataKey="balance" stroke={c.out} strokeWidth={2.5} fill="url(#gradDebt)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="ft">
            <button type="button" className="btn" onClick={onClose}>Cerrar</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
