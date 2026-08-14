"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button,
} from "@heroui/react";
import { Mic, MicOff, Check, CreditCard as CreditCardIcon, Volume2 } from "lucide-react";
import { CreditCardItem, TransactionItem } from "@/types";
import { money, round2 } from "@/lib/format";
import { bestCardFor, CardRecommendation } from "@/lib/finance-utils";

// ─────────────────────────────────────────────────────────────────
// Asistente de voz 100% local: Web Speech API para escuchar,
// reglas en español para entender, speechSynthesis para responder.
// Sin servicios de pago.
// ─────────────────────────────────────────────────────────────────

type Intent =
  | { kind: "expense"; label: string; amount: number; category: string }
  | { kind: "income"; label: string; amount: number }
  | { kind: "bestCard"; amount: number }
  | { kind: "balance" }
  | { kind: "unknown" };

// "cinco mil" no; "5 mil" y "5000" y "5,000.50" sí
function parseAmount(text: string): number | null {
  const milMatch = text.match(/(\d+(?:[.,]\d+)?)\s*mil\b/i);
  if (milMatch) {
    const n = parseFloat(milMatch[1].replace(",", "."));
    if (Number.isFinite(n)) return round2(n * 1000);
  }
  const numMatch = text.match(/\$?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/);
  if (numMatch) {
    const n = parseFloat(numMatch[1].replace(/,/g, ""));
    if (Number.isFinite(n)) return round2(n);
  }
  return null;
}

const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/taco|comida|restaurante|café|cafe|desayuno|cena|pizza|hamburgue/i, "Comida"],
  [/súper|super|despensa|walmart|soriana|chedraui|costco/i, "Súper"],
  [/uber|didi|taxi|gasolina|camión|camion|metro|estacionamiento/i, "Transporte"],
  [/luz|agua|gas|internet|teléfono|telefono|cfe|telmex/i, "Servicios"],
  [/renta|casa|hogar|mueble/i, "Hogar"],
  [/doctor|medicina|farmacia|dentista/i, "Salud"],
  [/cine|juego|concierto|fiesta|bar|antro/i, "Entretenimiento"],
  [/ropa|zapatos|tenis/i, "Ropa"],
  [/escuela|colegiatura|curso|libro/i, "Educación"],
  [/netflix|spotify|suscripción|suscripcion/i, "Suscripción"],
];

function guessCategory(text: string): string {
  for (const [re, cat] of CATEGORY_KEYWORDS) {
    if (re.test(text)) return cat;
  }
  return "Otros";
}

function extractLabel(text: string, amount: number | null): string {
  // "gasté 200 en tacos con los amigos" → "tacos con los amigos"
  const enMatch = text.match(/\b(?:en|de|para)\s+(.{2,60})$/i);
  if (enMatch) return enMatch[1].trim().replace(/[.?!]+$/, "");
  // sin "en ...": limpiar verbo y monto
  let label = text
    .replace(/gast(é|e|amos)|compr(é|e)|pagu(é|e)|recib(í|i)|ingres(é|o)|deposit(é|aron|o)/gi, "")
    .replace(/\$?\s*[\d,.]+\s*(mil)?/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return label.slice(0, 60) || "Registro por voz";
}

function parseIntent(raw: string): Intent {
  const text = raw.toLowerCase().trim();
  const amount = parseAmount(text);

  // ¿Qué tarjeta me conviene?
  if (/tarjeta/.test(text) && /(conviene|mejor|cu[aá]l|recomien|usar)/.test(text)) {
    return { kind: "bestCard", amount: amount ?? 0 };
  }
  if (/(quiero|voy a|pienso)\s+(gastar|comprar)/.test(text) && /tarjeta|conviene/.test(text)) {
    return { kind: "bestCard", amount: amount ?? 0 };
  }

  // ¿Cuánto tengo?
  if (/(cu[aá]nto)\s+(tengo|me queda|hay|dispon)/.test(text) || /mi (balance|disponible|saldo)/.test(text)) {
    return { kind: "balance" };
  }

  // Ingreso
  if (/(recib[íi]|me pagaron|ingreso|deposit|n[oó]mina|cobr[eé])/.test(text) && amount) {
    return { kind: "income", label: extractLabel(raw, amount), amount };
  }

  // Gasto (default si hay verbo de gasto o simplemente monto + "en")
  if (amount && /(gast|compr|pagu|pag[oé])/.test(text)) {
    return { kind: "expense", label: extractLabel(raw, amount), amount, category: guessCategory(text) };
  }
  if (amount && /\b(en|de)\b/.test(text)) {
    return { kind: "expense", label: extractLabel(raw, amount), amount, category: guessCategory(text) };
  }

  return { kind: "unknown" };
}

function speak(text: string) {
  try {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-MX";
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  } catch { /* sin síntesis de voz */ }
}

const fmtDate = (d: Date) => d.toLocaleDateString("es-MX", { day: "numeric", month: "long" });

export default function VoiceAssistant({ isOpen, onOpenChange, cards, available, onAddTransaction }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CreditCardItem[];
  available: number;
  onAddTransaction: (t: Omit<TransactionItem, "id">) => void;
}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported, setSupported] = useState(true);
  const [response, setResponse] = useState<string>("");
  const [pendingTx, setPendingTx] = useState<Omit<TransactionItem, "id"> | null>(null);
  const [recommendations, setRecommendations] = useState<CardRecommendation[] | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSupported(!!SR);
  }, []);

  const reset = () => {
    setTranscript("");
    setResponse("");
    setPendingTx(null);
    setRecommendations(null);
  };

  const handleResult = (text: string) => {
    setTranscript(text);
    const intent = parseIntent(text);

    if (intent.kind === "expense") {
      const tx: Omit<TransactionItem, "id"> = {
        label: intent.label,
        amount: intent.amount,
        date: new Date().toISOString().split("T")[0],
        type: "expense",
        category: intent.category,
        source: "manual",
      };
      setPendingTx(tx);
      const msg = `Entendido: gasto de ${money(intent.amount)} en ${intent.label}, categoría ${intent.category}. ¿Lo registro?`;
      setResponse(msg);
      speak(msg);
      return;
    }

    if (intent.kind === "income") {
      const tx: Omit<TransactionItem, "id"> = {
        label: intent.label,
        amount: intent.amount,
        date: new Date().toISOString().split("T")[0],
        type: "income",
        category: "Nómina",
        source: "manual",
      };
      setPendingTx(tx);
      const msg = `Entendido: ingreso de ${money(intent.amount)} por ${intent.label}. ¿Lo registro?`;
      setResponse(msg);
      speak(msg);
      return;
    }

    if (intent.kind === "bestCard") {
      if (cards.length === 0) {
        const msg = "Aún no tienes tarjetas registradas. Agrégalas en la sección de Tarjetas de Crédito.";
        setResponse(msg);
        speak(msg);
        return;
      }
      const recs = bestCardFor(intent.amount, cards);
      setRecommendations(recs);
      const top = recs[0];
      let msg: string;
      if (intent.amount > 0 && !top.fits) {
        msg = `Ojo: ninguna tarjeta tiene ${money(intent.amount)} de crédito disponible. La que más tiene es ${top.card.label} con ${money(top.availableCredit)}.`;
      } else {
        msg = `Te conviene ${top.card.label}: la compra cae en el corte del ${fmtDate(top.statementClose)} y la pagarías hasta el ${fmtDate(top.dueDate)} — ${top.floatDays} días de financiamiento sin intereses.`;
      }
      setResponse(msg);
      speak(msg);
      return;
    }

    if (intent.kind === "balance") {
      const msg = `Tienes ${money(available)} disponibles.`;
      setResponse(msg);
      speak(msg);
      return;
    }

    const msg = 'No te entendí. Prueba: "gasté 200 en tacos" o "quiero gastar 5 mil, ¿qué tarjeta me conviene?"';
    setResponse(msg);
    speak("No te entendí, intenta de nuevo.");
  };

  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    reset();
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "es-MX";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
      setTranscript(text);
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false);
        handleResult(text);
      }
    };
    rec.onerror = () => {
      setListening(false);
      setResponse("No pude escucharte. Revisa el permiso del micrófono.");
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const confirmTx = () => {
    if (!pendingTx) return;
    onAddTransaction(pendingTx);
    const msg = "Registrado.";
    setResponse(msg);
    speak(msg);
    setPendingTx(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(o) => { onOpenChange(o); if (!o) { stopListening(); reset(); } }}
      backdrop="blur" placement="center"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2">
              <Volume2 size={18} className="text-emerald-500" />
              Asistente de voz
            </ModalHeader>
            <ModalBody className="pb-2">
              {!supported ? (
                <p className="text-sm text-default-500 py-4 text-center">
                  Tu navegador no soporta reconocimiento de voz. Usa Chrome, Edge o Safari.
                </p>
              ) : (
                <>
                  {/* Botón de micrófono */}
                  <div className="flex flex-col items-center gap-3 py-2">
                    <button
                      onClick={listening ? stopListening : startListening}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                        listening
                          ? "bg-rose-500 text-white animate-pulse shadow-rose-500/40 scale-110"
                          : "bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-emerald-500/40 hover:scale-105"
                      }`}
                      aria-label={listening ? "Detener" : "Hablar"}
                    >
                      {listening ? <MicOff size={30} /> : <Mic size={30} />}
                    </button>
                    <p className="text-xs text-default-400">
                      {listening ? "Escuchando… habla ahora" : "Toca y di algo como:"}
                    </p>
                    {!listening && !transcript && (
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {["“Gasté 250 en tacos”", "“Quiero gastar 5 mil, ¿qué tarjeta me conviene?”", "“¿Cuánto tengo disponible?”"].map((s) => (
                          <span key={s} className="text-[10px] px-2 py-1 rounded-full bg-default-100 text-default-500">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Transcripción */}
                  {transcript && (
                    <div className="px-3 py-2 rounded-xl bg-default-100 text-sm text-default-600 italic">
                      "{transcript}"
                    </div>
                  )}

                  {/* Respuesta */}
                  {response && (
                    <div className="px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-default-700">
                      {response}
                    </div>
                  )}

                  {/* Ranking de tarjetas */}
                  {recommendations && recommendations.length > 0 && (
                    <div className="space-y-1.5">
                      {recommendations.map((r, i) => (
                        <div key={r.card.id} className={`flex items-center gap-3 p-2.5 rounded-xl border ${
                          i === 0 && r.fits
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-default-50 border-default-200/60"
                        }`}>
                          <CreditCardIcon size={16} className={i === 0 && r.fits ? "text-emerald-500" : "text-default-400"} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold flex items-center gap-1.5">
                              {r.card.label}
                              {i === 0 && r.fits && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">Mejor opción</span>}
                            </p>
                            <p className="text-[11px] text-default-400">
                              Pagas hasta el {fmtDate(r.dueDate)} · <span className="font-bold text-default-600">{r.floatDays} días</span> de financiamiento
                              {!r.fits && <span className="text-rose-500 font-bold"> · crédito insuficiente ({money(r.availableCredit)})</span>}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Confirmar registro dictado */}
                  {pendingTx && (
                    <Button
                      color={pendingTx.type === "expense" ? "danger" : "success"}
                      variant="shadow" className="font-bold"
                      startContent={<Check size={16} />}
                      onPress={confirmTx}
                    >
                      Sí, registrar {pendingTx.type === "expense" ? "gasto" : "ingreso"} de {money(pendingTx.amount)}
                    </Button>
                  )}
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>Cerrar</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
