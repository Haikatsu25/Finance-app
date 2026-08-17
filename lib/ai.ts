// Cliente mínimo de la API de Google Gemini (tier gratuito, sin tarjeta).
// Clave gratis en https://aistudio.google.com/apikey → env GEMINI_API_KEY.

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export interface AiMessage {
    role: "user" | "assistant";
    content: string;
}

interface GeminiPart {
    text?: string;
    inline_data?: { mime_type: string; data: string };
}

async function callGemini(body: Record<string, unknown>): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("MISSING_API_KEY");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error("[gemini] API error", res.status, errBody.slice(0, 400));
        if (res.status === 429) throw new Error("RATE_LIMITED");
        throw new Error(`GEMINI_${res.status}`);
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    const text = Array.isArray(parts)
        ? parts.map((p: any) => p.text || "").join("")
        : "";
    return text || "";
}

/** Chat de texto con instrucción de sistema e historial. */
export async function aiChat(opts: {
    system: string;
    messages: AiMessage[];
    maxTokens?: number;
}): Promise<string> {
    return callGemini({
        system_instruction: { parts: [{ text: opts.system }] },
        contents: opts.messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
        })),
        generationConfig: {
            maxOutputTokens: opts.maxTokens ?? 800,
            temperature: 0.6,
        },
    });
}

/** Visión: imagen en base64 + instrucción. */
export async function aiVision(opts: {
    prompt: string;
    mediaType: string;
    base64: string;
    maxTokens?: number;
}): Promise<string> {
    const parts: GeminiPart[] = [
        { inline_data: { mime_type: opts.mediaType, data: opts.base64 } },
        { text: opts.prompt },
    ];
    return callGemini({
        contents: [{ role: "user", parts }],
        generationConfig: {
            maxOutputTokens: opts.maxTokens ?? 400,
            temperature: 0.1,
        },
    });
}
