"use client";

import React, { useRef, useState, useEffect } from "react";
import { Card, CardBody, Input, Button } from "@heroui/react";
import { Send, Sparkles, Bot, User } from "lucide-react";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "¿Cómo voy este mes?",
  "¿Puedo gastar $2,000 este fin de semana?",
  "¿Qué tarjeta me conviene pagar primero?",
  "Dame un plan para ahorrar $10,000",
];

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
    <Card className="glass border border-indigo-500/20">
      <CardBody className="p-0 flex flex-col">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2.5 border-b border-default-100/60">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
            <Sparkles size={15} className="text-indigo-500" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Pregúntale a FinanceAI</h4>
            <p className="text-[11px] text-default-400">La IA conoce tu resumen financiero y responde con tus números reales</p>
          </div>
        </div>

        <div className="flex-1 min-h-[220px] max-h-[380px] overflow-y-auto px-5 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-4">
              <Bot size={28} className="mx-auto mb-2 text-indigo-400/50" />
              <p className="text-xs text-default-400 mb-4">Prueba con una de estas:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="p-1.5 rounded-lg bg-indigo-500/12 h-fit shrink-0">
                  <Bot size={13} className="text-indigo-500" />
                </div>
              )}
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-indigo-500 text-white rounded-br-md"
                  : "bg-default-100 text-default-700 rounded-bl-md"
              }`}>
                {m.content}
              </div>
              {m.role === "user" && (
                <div className="p-1.5 rounded-lg bg-default-100 h-fit shrink-0">
                  <User size={13} className="text-default-500" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/12 h-fit">
                <Bot size={13} className="text-indigo-500" />
              </div>
              <div className="px-3.5 py-2.5 rounded-2xl bg-default-100 text-default-400 text-sm rounded-bl-md">
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

        <div className="px-4 pb-4 pt-2 flex gap-2 border-t border-default-100/60">
          <Input
            placeholder="Escribe tu pregunta…"
            size="sm"
            variant="bordered"
            value={input}
            onValueChange={setInput}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            className="flex-1"
          />
          <Button
            isIconOnly size="sm" color="primary" variant="shadow"
            className="bg-indigo-500"
            isDisabled={!input.trim() || loading}
            onPress={() => send()}
            aria-label="Enviar"
          >
            <Send size={15} />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
