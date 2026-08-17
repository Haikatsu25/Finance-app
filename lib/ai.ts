// Cliente mínimo de la API de Google Gemini (tier gratuito, sin tarjeta).
// Clave gratis en https://aistudio.google.com/apikey → env GEMINI_API_KEY.
//
// Google renombra modelos con frecuencia. Estrategia autocurativa:
//   1) intentar el modelo configurado/conocidos
//   2) si todos dan 404, preguntarle a la API qué modelos EXISTEN para
//      esta clave (ListModels), elegir el mejor "flash" y recordarlo.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const STATIC_CANDIDATES = [
    process.env.GEMINI_MODEL,
    "gemini-flash-latest",   // alias siempre-actual de Google
    "gemini-3.5-flash",
    "gemini-2.5-flash",
].filter(Boolean) as string[];

// Se recuerda entre invocaciones mientras viva la instancia serverless
let discoveredModel: string | null = null;

export interface AiMessage {
    role: "user" | "assistant";
    content: string;
}

interface GeminiPart {
    text?: string;
    inline_data?: { mime_type: string; data: string };
}

function getKey(): string {
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("MISSING_API_KEY");
    return apiKey;
}

/**
 * Pregunta a Google qué modelos soporta esta clave y elige el mejor flash,
 * EXCLUYENDO los que ya fallaron en esta llamada (Google a veces lista
 * modelos retirados que responden 404 al usarlos).
 */
async function discoverModel(apiKey: string, exclude: Set<string>): Promise<string | null> {
    try {
        const res = await fetch(`${API_BASE}/models?key=${apiKey}&pageSize=100`);
        if (!res.ok) {
            console.error("[gemini] ListModels error", res.status);
            return null;
        }
        const data = await res.json();
        const models: string[] = (data?.models || [])
            .filter((m: any) => (m.supportedGenerationMethods || []).includes("generateContent"))
            .map((m: any) => String(m.name || "").replace(/^models\//, ""))
            // Excluir especializados y los que ya fallaron
            .filter((n: string) => n && !/embed|imagen|image|tts|audio|live|veo|aqa|learnlm/i.test(n))
            .filter((n: string) => !exclude.has(n));

        if (!models.length) return null;

        // Versión numérica del nombre ("gemini-3.7-flash" → 3.7); latest = infinito
        const version = (n: string) => {
            if (/latest/i.test(n)) return 999;
            const m = n.match(/gemini-(\d+(?:\.\d+)?)/i);
            return m ? parseFloat(m[1]) : 0;
        };
        // Preferencia: flash > otros; versión más NUEVA primero; sin lite/preview
        const score = (n: string) => {
            let s = 0;
            if (/flash/i.test(n)) s -= 1000;
            if (/lite/i.test(n)) s += 100;
            if (/preview|exp/i.test(n)) s += 200;
            s -= version(n) * 10; // más nuevo = mejor
            return s;
        };
        models.sort((a, b) => score(a) - score(b));
        console.log("[gemini] modelos disponibles:", models.slice(0, 6).join(", "), "→ usando:", models[0]);
        return models[0];
    } catch (err) {
        console.error("[gemini] ListModels failed", err);
        return null;
    }
}

type TryResult = { ok: true; text: string } | { ok: false; status: number };

async function tryModel(apiKey: string, model: string, body: Record<string, unknown>): Promise<TryResult> {
    let res: Response;
    try {
        res = await fetch(`${API_BASE}/models/${model}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
        });
    } catch (err) {
        console.error("[gemini] network error", model, err);
        return { ok: false, status: 0 };
    }

    if (res.ok) {
        const data = await res.json();
        const parts = data?.candidates?.[0]?.content?.parts;
        const text = Array.isArray(parts) ? parts.map((p: any) => p.text || "").join("") : "";
        if (text) return { ok: true, text };
        console.error("[gemini] empty response", model, JSON.stringify(data).slice(0, 300));
        return { ok: false, status: 204 };
    }

    const errBody = await res.text().catch(() => "");
    console.error("[gemini] API error", res.status, "model:", model, errBody.slice(0, 300));
    return { ok: false, status: res.status };
}

async function callGemini(body: Record<string, unknown>): Promise<string> {
    const apiKey = getKey();

    const candidates = Array.from(new Set(
        [discoveredModel, ...STATIC_CANDIDATES].filter(Boolean) as string[],
    ));

    let sawRateLimit = false;
    let lastStatus = 0;
    const failed = new Set<string>();

    for (const model of candidates) {
        const r = await tryModel(apiKey, model, body);
        if (r.ok) { discoveredModel = model; return r.text; }
        failed.add(model);
        lastStatus = r.status;
        if (r.status === 429) { sawRateLimit = true; continue; }
        if (r.status === 400 || r.status === 401 || r.status === 403) throw new Error("BAD_KEY");
        // 404 → probar siguiente candidato
    }

    // Todos fallaron: preguntar a Google qué modelos existen realmente,
    // excluyendo los que acaban de fallar. Hasta 3 intentos con distintos.
    for (let i = 0; i < 3; i++) {
        const found = await discoverModel(apiKey, failed);
        if (!found) break;
        const r = await tryModel(apiKey, found, body);
        if (r.ok) {
            discoveredModel = found; // recordar para las siguientes llamadas
            return r.text;
        }
        failed.add(found);
        if (r.status === 429) sawRateLimit = true;
        if (r.status === 400 || r.status === 401 || r.status === 403) throw new Error("BAD_KEY");
        lastStatus = r.status;
    }

    if (sawRateLimit) throw new Error("RATE_LIMITED");
    throw new Error(`GEMINI_${lastStatus || "UNKNOWN"}`);
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
