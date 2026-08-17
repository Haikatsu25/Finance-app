"use client";

import React, { useRef, useState, useEffect } from "react";
import { Card, CardBody, Input, Button } from "@heroui/react";
import { Send, Sparkles, Bot, User, RotateCcw, Brain } from "lucide-react";

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
            <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
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

export default function AIChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, loading]);

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

  return (
    <div className="space-y-4" id="ai-section">
      {/* Header del tab */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
            <Brain className="text-indigo-500 w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold section-title gradient-text-purple">FinanceAI</h3>
            <p className="text-xs text-default-400 mt-0.5">
              Tu asesor personal — conoce tus tarjetas, MSI, presupuestos y movimientos
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            size="sm" variant="flat"
            startContent={<RotateCcw size={13} />}
            onPress={() => setMessages([])}
            className="text-default-500"
          >
            Nueva conversación
          </Button>
        )}
      </div>

      <Card className="glass border border-indigo-500/20">
        <CardBody className="p-0 flex flex-col">
          {/* Mensajes */}
          <div className="flex-1 min-h-[380px] max-h-[58vh] overflow-y-auto px-5 py-5 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-center">
                <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/25 mb-4">
                  <Sparkles size={28} className="text-indigo-400" />
                </div>
                <p className="text-sm font-bold text-default-700 mb-1">¿En qué te ayudo con tu dinero?</p>
                <p className="text-xs text-default-400 mb-6 max-w-[300px]">
                  Respondo con tus números reales: disponible, tarjetas, meses sin intereses y gastos.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 hover:scale-[1.03] transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="p-1.5 rounded-lg bg-indigo-500/12 h-fit shrink-0 mt-0.5">
                    <Bot size={14} className="text-indigo-500" />
                  </div>
                )}
                <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-indigo-500 text-white rounded-br-md"
                    : "bg-default-100 text-default-700 rounded-bl-md"
                }`}>
                  {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
                </div>
                {m.role === "user" && (
                  <div className="p-1.5 rounded-lg bg-default-100 h-fit shrink-0 mt-0.5">
                    <User size={14} className="text-default-500" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="p-1.5 rounded-lg bg-indigo-500/12 h-fit">
                  <Bot size={14} className="text-indigo-500" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-default-100 text-default-400 text-sm rounded-bl-md">
                  <span className="inline-flex gap-1">
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
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="shrink-0 text-[10px] font-medium px-2.5 py-1 rounded-full bg-default-100 text-default-500 hover:bg-indigo-500/15 hover:text-indigo-500 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-default-100/60">
            <Input
              placeholder="Pregúntale lo que sea sobre tu dinero…"
              size="md"
              variant="bordered"
              value={input}
              onValueChange={setInput}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              className="flex-1"
            />
            <Button
              isIconOnly color="primary" variant="shadow"
              className="bg-indigo-500"
              isDisabled={!input.trim() || loading}
              onPress={() => send()}
              aria-label="Enviar"
            >
              <Send size={16} />
            </Button>
          </div>
        </CardBody>
      </Card>

      <p className="text-[10px] text-default-400 text-center">
        FinanceAI puede equivocarse — verifica las cifras importantes. No es asesoría financiera certificada.
      </p>
    </div>
  );
}
