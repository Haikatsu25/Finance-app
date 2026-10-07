"use client";

import React, { useRef, useState, useEffect } from "react";
import { Send, RotateCcw } from "lucide-react";

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

  return (
    <section className="pop-card wide" id="ai-section">
      <div className="sec-h">
        <h2 className="sec">FinanceAI</h2>
        {messages.length > 0 ? (
          <button type="button" className="btn ghost sm" onClick={() => setMessages([])}>
            <RotateCcw size={14} aria-hidden /> Nueva conversación
          </button>
        ) : (
          <span className="chip">Tu asesor</span>
        )}
      </div>

      {/* Mensajes */}
      <div className="chat" role="log" aria-label="Conversación con FinanceAI" aria-live="polite" tabIndex={0}
        style={messages.length > 0 ? { maxHeight: "56vh", overflowY: "auto", marginBottom: 12 } : undefined}>
        {messages.length === 0 && (
          <p className="summary">
            Respondo con tus números reales: disponible, tarjetas, meses sin intereses y gastos.
          </p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role === "user" ? "me" : "ai"}`}>
            {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
          </div>
        ))}

        {loading && (
          <div className="msg ai" role="status" aria-label="FinanceAI está escribiendo">
            <span className="inline-flex gap-1" aria-hidden>
              <span className="animate-pulse">●</span>
              <span className="animate-pulse" style={{ animationDelay: "150ms" }}>●</span>
              <span className="animate-pulse" style={{ animationDelay: "300ms" }}>●</span>
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sugerencias */}
      {!loading && (
        <div className="chips">
          {(messages.length === 0 ? SUGGESTIONS : SUGGESTIONS.slice(0, 4)).map((s) => (
            <button key={s} type="button" onClick={() => send(s)}>{s}</button>
          ))}
        </div>
      )}

      {/* Pregunta */}
      <form className="ask" style={{ marginTop: 12 }} onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input
          placeholder="Pregúntame lo que sea sobre tu dinero"
          aria-label="Tu pregunta"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" aria-label="Enviar" disabled={!input.trim() || loading}>
          <Send size={18} aria-hidden />
        </button>
      </form>

      <p className="summary" style={{ margin: "10px 0 0", fontSize: 11 }}>
        FinanceAI puede equivocarse: verifica las cifras importantes. No es asesoría financiera certificada.
      </p>
    </section>
  );
}
