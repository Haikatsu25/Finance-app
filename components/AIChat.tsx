"use client";

import React, { useRef, useState, useEffect } from "react";
import { Card, CardBody, Input, Button } from "@heroui/react";
import { Send, Sparkles, Bot, RotateCcw } from "lucide-react";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "¿Cómo voy este mes?",
  "¿Qué tarjeta me conviene pagar primero?",
  "Dame un plan para ahorrar $10,000",
  "¿En qué estoy gastando de más?",
  "¿Puedo permitirme un gasto de $3,000?",
  "¿Cuánto debería apartar para emergencias?",
];

// ─────────────────────────────────────────────────────────────────
// Mini-renderizador de markdown: **negritas** y listas con "- "
// (suficiente para las respuestas del asistente, sin dependencias)
// ─────────────────────────────────────────────────────────────────
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={`${keyPrefix}-${i}`} className="font-bold text-foreground">{part.slice(2, -2)}</strong>
      : <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
  );
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (!listItems.length) return;
    blocks.push(
      <ul key={key} className="space-y-1 my-1.5 pl-1">
        {listItems.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="shrink-0 mt-0.5" aria-hidden>•</span>
            <span>{renderInline(item, `li-${key}-${i}`)}</span>
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, i) => {
    const listMatch = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)/);
    if (listMatch) {
      listItems.push(listMatch[1]);
      return;
    }
    flushList(`ul-${i}`);
    if (line.trim() === "") {
      blocks.push(<div key={`sp-${i}`} className="h-1.5" />);
    } else {
      blocks.push(<p key={`p-${i}`}>{renderInline(line, `p-${i}`)}</p>);
    }
  });
  flushList("ul-end");
  return <div className="space-y-0.5">{blocks}</div>;
}

export default function AIChat({ queuedPrompt, onPromptConsumed }: {
  /** Pregunta disparada desde fuera (p. ej. el botón de análisis profundo) */
  queuedPrompt?: string | null;
  onPromptConsumed?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

  useEffect(() => {
    if (queuedPrompt) {
      send(queuedPrompt);
      onPromptConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedPrompt]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next: ChatMsg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = data?.reply
        || (res.status === 503
          ? "Falta configurar la clave gratuita GEMINI_API_KEY en el servidor para activar el chat."
          : res.status === 429
            ? "La IA alcanzó su límite gratuito por ahora. Intenta en un minuto."
            : "No pude responder ahora mismo. Intenta de nuevo en un momento.");
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Error de conexión. Revisa tu internet e intenta de nuevo." }]);
    } finally {
      setLoading(false);
    }
  };

  const CHIP = "min-h-11 px-3.5 rounded-full border border-default-300 text-[13px] font-semibold hover:border-foreground hover:bg-foreground/5 transition-colors";

  return (
    <div className="space-y-4" id="ai-section">
      {/* Header del tab */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-xl font-bold section-title">FinanceAI</h3>
          <p className="text-xs text-default-600 mt-1">
            Tu asesor personal. Conoce tus tarjetas, MSI, presupuestos y movimientos
          </p>
        </div>
        {messages.length > 0 && (
          <Button
            variant="bordered"
            startContent={<RotateCcw size={14} />}
            onPress={() => setMessages([])}
            className="h-11 font-bold border-2 border-foreground"
          >
            Nueva conversación
          </Button>
        )}
      </div>

      <Card className="glass rule-ink shadow-none">
        <CardBody className="p-0 flex flex-col">
          {/* Mensajes */}
          <div
            className="flex-1 min-h-[380px] max-h-[58vh] overflow-y-auto px-5 py-5 space-y-4"
            role="log" aria-label="Conversación con FinanceAI" aria-live="polite" tabIndex={0}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-center">
                <Sparkles size={30} className="mb-4" aria-hidden />
                <p className="text-base font-bold mb-1">¿En qué te ayudo con tu dinero?</p>
                <p className="text-xs text-default-600 mb-6 max-w-[300px]">
                  Respondo con tus números reales: disponible, tarjetas, meses sin intereses y gastos.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className={CHIP}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-8 h-8 grid place-items-center rounded-lg border border-default-300 shrink-0 mt-0.5" aria-hidden>
                    <Bot size={16} />
                  </div>
                )}
                <div className={`max-w-[85%] px-4 py-3 rounded-xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-foreground text-background rounded-br-sm"
                    : "bg-default-100 border border-default-200 text-foreground rounded-bl-sm"
                }`}>
                  {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5" role="status" aria-label="FinanceAI está escribiendo">
                <div className="w-8 h-8 grid place-items-center rounded-lg border border-default-300 shrink-0" aria-hidden>
                  <Bot size={16} />
                </div>
                <div className="px-4 py-3 rounded-xl bg-default-100 border border-default-200 text-default-600 text-sm rounded-bl-sm">
                  <span className="inline-flex gap-1" aria-hidden>
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse" style={{ animationDelay: "150ms" }}>●</span>
                    <span className="animate-pulse" style={{ animationDelay: "300ms" }}>●</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Sugerencias rápidas cuando ya hay conversación */}
          {messages.length > 0 && !loading && (
            <div className="px-4 pt-2 flex gap-1.5 overflow-x-auto pb-1">
              {SUGGESTIONS.slice(0, 4).map((s) => (
                <button key={s} onClick={() => send(s)} className={`${CHIP} shrink-0 text-xs`}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 pb-4 pt-2 flex items-center gap-2 border-t border-default-200">
            <Input
              placeholder="Pregúntale lo que sea sobre tu dinero…"
              aria-label="Tu pregunta"
              size="md"
              variant="bordered"
              value={input}
              onValueChange={setInput}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              className="flex-1"
            />
            <Button
              isIconOnly color="primary" variant="solid"
              className="min-w-11 w-11 h-11"
              isDisabled={!input.trim() || loading}
              onPress={() => send()}
              aria-label="Enviar"
            >
              <Send size={16} />
            </Button>
          </div>
        </CardBody>
      </Card>

      <p className="text-xs text-default-600 text-center">
        FinanceAI puede equivocarse: verifica las cifras importantes. No es asesoría financiera certificada.
      </p>
    </div>
  );
}
