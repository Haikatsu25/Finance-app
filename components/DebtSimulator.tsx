"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Slider,
} from "@heroui/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Calculator, TrendingDown, Clock, Flame } from "lucide-react";
import { CreditCardItem } from "@/types";
import { money, moneyExact } from "@/lib/format";
import { amortize } from "@/lib/finance-utils";

export default function DebtSimulator({ card, onClose }: {
  card: CreditCardItem | null;
  onClose: () => void;
}) {
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

  return (
    <Modal isOpen={card !== null} onOpenChange={(open) => { if (!open) onClose(); }} size="2xl" backdrop="blur" scrollBehavior="inside"
      classNames={{ closeButton: "w-11 h-11 flex items-center justify-center" }}>
      <ModalContent>
        {(close) => card && (
          <>
            <ModalHeader className="flex items-center gap-2">
              <Calculator size={18} aria-hidden />
              Simulador: {card.label}
            </ModalHeader>
            <ModalBody>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 w-full space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-default-500 mb-1">Deuda de contado</p>
                    <p className="figure text-[2.5rem]">{money(card.balance)}</p>
                  </div>
                  <Input
                    label="Tasa anual (%)"
                    type="number" min="0" size="md" variant="bordered"
                    value={aprInput} onValueChange={setAprInput}
                    description="El CAT de tu tarjeta (60–120% es común en México)"
                  />
                  <div>
                    <p className="text-xs text-default-500 mb-2">
                      Pago mensual: <span className="figure text-xl text-foreground">{moneyExact(payment)}</span>
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
                </div>

                <div className="flex-1 w-full">
                  {never ? (
                    <div className="p-4 rounded-lg bg-money-out/10 border border-money-out/30">
                      <p className="text-sm font-bold text-money-out-text flex items-center gap-1.5">
                        <Flame size={15} aria-hidden /> Con ese pago nunca terminas
                      </p>
                      <p className="text-xs text-default-600 mt-1">
                        El interés mensual es {moneyExact(result!.minViablePayment)}. Cualquier pago menor
                        o igual a eso solo alimenta al banco: la deuda no baja jamás.
                      </p>
                    </div>
                  ) : result && (
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-ink/5 border border-ink/20 flex items-center gap-3">
                        <Clock size={18} className="shrink-0" aria-hidden />
                        <div>
                          <p className="figure text-[1.6rem]">
                            {result.months} {result.months === 1 ? "mes" : "meses"}
                            <span className="text-xs font-medium text-default-500 ml-1" style={{ fontStretch: "100%", fontVariationSettings: '"wdth" 100', fontWeight: 500, letterSpacing: 0 }}>
                              ({Math.floor(result.months / 12) > 0 ? `${Math.floor(result.months / 12)}a ${result.months % 12}m` : "menos de un año"})
                            </span>
                          </p>
                          <p className="text-xs text-default-500">para liquidar la deuda</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-money-out/10 border border-money-out/30 flex items-center gap-3">
                        <Flame size={18} className="text-money-out-text shrink-0" aria-hidden />
                        <div>
                          <p className="figure text-[1.6rem] text-money-out-text">{money(result.totalInterest)}</p>
                          <p className="text-xs text-default-500">pagarás solo de intereses</p>
                        </div>
                      </div>
                      {better && Number.isFinite(better.months) && Number.isFinite(result.months) && better.months < result.months && (
                        <div className="p-3 rounded-lg bg-money-in/10 border border-money-in/30 flex items-center gap-3">
                          <TrendingDown size={18} className="text-money-in-text shrink-0" aria-hidden />
                          <p className="text-xs text-default-600 leading-snug">
                            Con <span className="font-bold text-foreground">$500 más al mes</span> terminas{" "}
                            <span className="font-bold text-foreground">{result.months - better.months} meses antes</span> y ahorras{" "}
                            <span className="font-bold text-money-in-text tnum">{money(result.totalInterest - better.totalInterest)}</span> en intereses.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Curva de amortización */}
              {result && Number.isFinite(result.months) && result.schedule.length > 1 && (
                <div className="sim-chart h-[200px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.schedule} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradDebt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#e11d48" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#e11d48" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                        label={{ value: "meses", position: "insideBottomRight", fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} width={48} />
                      <Tooltip
                        formatter={(v) => [moneyExact(Number(v)), "Saldo restante"]}
                        labelFormatter={(l) => `Mes ${l}`}
                        contentStyle={{ borderRadius: 8, fontSize: 12, background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--foreground)" }}
                      />
                      <Area type="monotone" dataKey="balance" stroke="#e11d48" strokeWidth={2.5} fill="url(#gradDebt)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" className="h-11 font-bold" onPress={close}>Cerrar</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
