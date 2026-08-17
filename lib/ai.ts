// Cliente mínimo de la API de Google Gemini (tier gratuito, sin tarjeta).
// Clave gratis en https://aistudio.google.com/apikey → env GEMINI_API_KEY.

// Si el modelo configurado no existe (Google los renombra seguido),
// se intenta en orden con estos hasta que uno responda.
const MODEL_CANDIDATES = [
    process.env.GEMINI_MODEL,
    "gemini-2.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
].filter(Boolean) as string[];

export interface AiMessage {
    role: "user" | "assistant";
    content: string;
}

interface GeminiPart {
    text?: string;
    inline_data?: { mime_type: string; data: string };
}

async function callGemini(body: Record<string, unknown>): Promise<string> {
    // .trim() por si la clave se pegó con espacios o salto de línea en Vercel
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("MISSING_API_KEY");

    let lastError: Error = new Error("GEMINI_UNKNOWN");

    for (const model of MODEL_CANDIDATES) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        let res: Response;
        try {
            res = await fetch(url, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
            });
        } catch (err) {
            console.error("[gemini] network error", model, err);
            lastError = new Error("GEMINI_NETWORK");
            continue;
        }

        if (res.ok) {
            const data = await res.json();
            const parts = data?.candidates?.[0]?.content?.parts;
            const text = Array.isArray(parts)
                ? parts.map((p: any) => p.text || "").join("")
                : "";
            if (text) return text;
            console.error("[gemini] empty response", model, JSON.stringify(data).slice(0, 300));
            lastError = new Error("GEMINI_EMPTY");
            continue;
        }

        const errBody = await res.text().catch(() => "");
        console.error("[gemini] API error", res.status, "model:", model, errBody.slice(0, 400));

        if (res.status === 429) { lastError = new Error("RATE_LIMITED"); continue; }
        if (res.status === 400 || res.status === 401 || res.status === 403) {
            // Clave inválida/restringida: no tiene caso probar otros modelos
            throw new Error("BAD_KEY");
        }
        if (res.status === 404) { lastError = new Error("GEMINI_404"); continue; } // modelo no existe → probar siguiente
        lastError = new Error(`GEMINI_${res.status}`);
    }

    throw lastError;
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
