"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Mic, MicOff, Check, CreditCard as CreditCardIcon, Volume2, AlertTriangle } from "lucide-react";
import { CreditCardItem, TransactionItem, InstallmentPlan } from "@/types";
import { money, round2 } from "@/lib/format";
import { bestCardFor, CardRecommendation, todayIso } from "@/lib/finance-utils";

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

export default function VoiceAssistant({ isOpen, onOpenChange, cards, installments = [], available, onAddTransaction }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cards: CreditCardItem[];
  installments?: InstallmentPlan[];
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
        date: todayIso(),
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
        date: todayIso(),
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
      const recs = bestCardFor(intent.amount, cards, installments);
      setRecommendations(recs);
      const top = recs[0];
      let msg: string;
      if (intent.amount > 0 && !top.fits) {
        msg = `Ojo: ninguna tarjeta tiene ${money(intent.amount)} de crédito disponible. La que más tiene es ${top.card.label} con ${money(top.availableCredit)}.`;
      } else {
        msg = `Te conviene ${top.card.label}: la compra cae en el corte del ${fmtDate(top.statementClose)} y la pagarías hasta el ${fmtDate(top.dueDate)}. Son ${top.floatDays} días de financiamiento sin intereses.`;
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

  const close = () => { onOpenChange(false); stopListening(); reset(); };

  return (
    <Sheet open={isOpen} onOpenChange={(o) => { if (!o) close(); else onOpenChange(o); }} title="Asistente de voz">
      {!supported ? (
        <p className="callout text-center">
          Tu navegador no soporta reconocimiento de voz. Usa Chrome, Edge o Safari.
        </p>
      ) : (
        <>
          {/* Micrófono: en reposo va relleno; al escuchar pasa a contorno y pulsa (el estado se
              distingue por forma, no solo por color) */}
          <div className="flex flex-col items-center gap-3 py-2">
            <button
              onClick={listening ? stopListening : startListening}
              className={`size-20 rounded-full grid place-items-center transition-colors ${
                listening
                  ? "bg-(--card-bg) text-foreground border-4 border-(--brand) animate-pulse"
                  : "bg-(--navy) text-white dark:bg-(--brand) dark:text-[#0a0c12]"
              }`}
              aria-label={listening ? "Detener" : "Hablar"}
              aria-pressed={listening}
            >
              {listening ? <MicOff size={30} aria-hidden /> : <Mic size={30} aria-hidden />}
            </button>
            <p className="text-sm font-semibold" role="status">
              {listening ? "Escuchando… habla ahora" : "Toca y di algo como:"}
            </p>
            {!listening && !transcript && (
              <ul className="chips justify-center">
                {["“Gasté 250 en tacos”", "“Quiero gastar 5 mil, ¿qué tarjeta me conviene?”", "“¿Cuánto tengo disponible?”"].map((s) => (
                  <li key={s} className="list-none text-xs px-3 py-1.5 rounded-full bg-(--cal)">{s}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Transcripción */}
          {transcript && <div className="callout italic">&ldquo;{transcript}&rdquo;</div>}

          {/* Respuesta */}
          {response && <div className="callout font-semibold" role="status">{response}</div>}

          {/* Ranking de tarjetas: la mejor, resaltada; el resto, sin énfasis */}
          {recommendations && recommendations.length > 0 && (
            <ul className="list">
              {recommendations.map((r, i) => {
                const best = i === 0 && r.fits;
                return (
                  <li key={r.card.id} className="it" style={best ? { outline: "2px solid var(--brand)" } : undefined}>
                    <i aria-hidden><CreditCardIcon size={18} /></i>
                    <div className="t" style={{ whiteSpace: "normal" }}>
                      <b className="flex items-center gap-2 flex-wrap" style={{ whiteSpace: "normal" }}>
                        {r.card.label}
                        {best && <span className="pill soon">Mejor opción</span>}
                      </b>
                      <small>
                        Pagas hasta el {fmtDate(r.dueDate)}. <b className="text-foreground">{r.floatDays} días</b> de financiamiento
                      </small>
                      {!r.fits && (
                        <p className="text-xs text-money-out-text font-bold mt-0.5 flex items-center gap-1">
                          <AlertTriangle size={12} aria-hidden /> Crédito insuficiente ({money(r.availableCredit)} disponibles)
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Confirmar registro dictado */}
          {pendingTx && (
            <button type="button" className={`btn ${pendingTx.type === "expense" ? "danger" : ""}`} onClick={confirmTx}>
              <Check size={16} aria-hidden /> Sí, registrar {pendingTx.type === "expense" ? "gasto" : "ingreso"} de {money(pendingTx.amount)}
            </button>
          )}
        </>
      )}
      <div className="ft">
        <button type="button" className="btn soft" onClick={close}>Cerrar</button>
      </div>
    </Sheet>
  );
}
