"use client";

import React, { useMemo, useState } from "react";
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
  React.useEffect(() => {
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
    <Modal isOpen={card !== null} onOpenChange={(open) => { if (!open) onClose(); }} size="2xl" backdrop="blur" scrollBehavior="inside">
      <ModalContent>
        {(close) => card && (
          <>
            <ModalHeader className="flex items-center gap-2">
              <Calculator size={18} className="text-cyan-500" />
              Simulador — {card.label}
            </ModalHeader>
            <ModalBody>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="flex-1 w-full space-y-4">
                  <div>
                    <p className="text-xs text-default-400 uppercase tracking-wider font-bold mb-1">Deuda</p>
                    <p className="text-2xl font-black tnum">{money(card.balance)}</p>
                  </div>
                  <Input
                    label="Tasa anual (%)"
                    type="number" min="0" size="sm" variant="bordered"
                    value={aprInput} onValueChange={setAprInput}
                    description="El CAT de tu tarjeta (60–120% es común en México)"
                  />
                  <div>
                    <p className="text-xs text-default-500 mb-2">
                      Pago mensual: <span className="font-bold tnum text-cyan-500">{moneyExact(payment)}</span>
                    </p>
                    <Slider
                      aria-label="Pago mensual"
                      size="sm"
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
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25">
                      <p className="text-sm font-bold text-rose-500 flex items-center gap-1.5">
                        <Flame size={15} /> Con ese pago nunca terminas
                      </p>
                      <p className="text-xs text-default-500 mt-1">
                        El interés mensual es {moneyExact(result!.minViablePayment)}. Cualquier pago menor
                        o igual a eso solo alimenta al banco — la deuda no baja jamás.
                      </p>
                    </div>
                  ) : result && (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center gap-3">
                        <Clock size={18} className="text-cyan-500 shrink-0" />
                        <div>
                          <p className="text-lg font-black tnum">
                            {result.months} {result.months === 1 ? "mes" : "meses"}
                            <span className="text-xs font-medium text-default-400 ml-1">
                              ({Math.floor(result.months / 12) > 0 ? `${Math.floor(result.months / 12)}a ${result.months % 12}m` : "menos de un año"})
                            </span>
                          </p>
                          <p className="text-[11px] text-default-400">para liquidar la deuda</p>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-3">
                        <Flame size={18} className="text-rose-500 shrink-0" />
                        <div>
                          <p className="text-lg font-black tnum text-rose-500">{money(result.totalInterest)}</p>
                          <p className="text-[11px] text-default-400">pagarás solo de intereses</p>
                        </div>
                      </div>
                      {better && Number.isFinite(better.months) && Number.isFinite(result.months) && better.months < result.months && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center gap-3">
                          <TrendingDown size={18} className="text-emerald-500 shrink-0" />
                          <p className="text-[11px] text-default-500 leading-snug">
                            Con <span className="font-bold text-emerald-500">$500 más al mes</span> terminas{" "}
                            <span className="font-bold">{result.months - better.months} meses antes</span> y ahorras{" "}
                            <span className="font-bold text-emerald-500 tnum">{money(result.totalInterest - better.totalInterest)}</span> en intereses.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Curva de amortización */}
              {result && Number.isFinite(result.months) && result.schedule.length > 1 && (
                <div className="h-[180px] w-full mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.schedule} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradDebt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.12)" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false}
                        label={{ value: "meses", position: "insideBottomRight", fontSize: 10, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} width={48} />
                      <Tooltip
                        formatter={(v) => [moneyExact(Number(v)), "Saldo restante"]}
                        labelFormatter={(l) => `Mes ${l}`}
                        contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      />
                      <Area type="monotone" dataKey="balance" stroke="#06b6d4" strokeWidth={2} fill="url(#gradDebt)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={close}>Cerrar</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
