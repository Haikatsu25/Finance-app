"use client";

import React, { useState } from "react";
import { Spinner } from "@heroui/react";
import { Sheet } from "@/components/ui/Sheet";
import { ScanLine, Camera, Check, AlertTriangle } from "lucide-react";
import { TransactionItem } from "@/types";
import { round2 } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "./Transactions";
import { todayIso } from "@/lib/finance-utils";
import { Picker } from "./ui/Picker";

type ScanState = "idle" | "processing" | "review" | "error";

/** Redimensiona la imagen en el navegador para no subir fotos de 12 MP. */
async function compressImage(file: File): Promise<{ data: string; mediaType: string }> {
  const bitmap = await createImageBitmap(file);
  const MAX = 1600;
  const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { data: dataUrl.split(",")[1], mediaType: "image/jpeg" };
}

export default function TicketScanner({ isOpen, onOpenChange, onConfirm }: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (t: Omit<TransactionItem, "id">) => void;
}) {
  const [state, setState] = useState<ScanState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);

  const reset = () => {
    setState("idle");
    setErrorMsg("");
    setLabel(""); setAmount(""); setDate("");
    setCategory(EXPENSE_CATEGORIES[0]);
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setState("processing");
    try {
      const { data, mediaType } = await compressImage(file);
      const res = await fetch("/api/ai/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, mediaType }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(
          body?.error === "missing_key"
            ? "Falta configurar la clave gratuita GEMINI_API_KEY en el servidor."
            : body?.error === "bad_key"
              ? "La clave GEMINI_API_KEY parece inválida. Revísala en Vercel y haz Redeploy."
            : body?.error === "rate_limited"
              ? "La IA alcanzó su límite gratuito por ahora. Intenta en un minuto."
              : body?.error === "no_legible"
                ? "No pude leer el ticket. Intenta con mejor luz y la foto derecha."
                : "No pude procesar la imagen. Intenta de nuevo.",
        );
        setState("error");
        return;
      }
      const parsed = await res.json();
      setLabel(parsed.label || "");
      setAmount(String(parsed.amount ?? ""));
      setDate(parsed.date || "");
      setCategory(EXPENSE_CATEGORIES.includes(parsed.category) ? parsed.category : "Otros");
      setState("review");
    } catch {
      setErrorMsg("Error al procesar la imagen.");
      setState("error");
    }
  };

  const amountValid = amount !== "" && Number.isFinite(parseFloat(amount)) && parseFloat(amount) > 0;

  const confirm = (close: () => void) => {
    if (!label.trim() || !amountValid) return;
    onConfirm({
      label: label.trim(),
      amount: round2(parseFloat(amount)),
      date: date || todayIso(),
      type: "expense",
      category,
      source: "scan",
    });
    reset();
    close();
  };

  const close = () => { onOpenChange(false); reset(); };

  return (
    <Sheet open={isOpen} onOpenChange={(o) => { if (!o) close(); else onOpenChange(o); }} title="Escanear ticket">
      {state === "idle" && (
        <label className="empty flex flex-col items-center justify-center gap-3 cursor-pointer focus-within:border-(--brand)" style={{ padding: "36px 12px" }}>
          <Camera size={32} aria-hidden />
          <span className="text-center">
            <b className="block text-sm text-foreground">Toma o sube la foto del ticket</b>
            <span className="block text-xs mt-1">La IA lee el comercio, el total y la fecha por ti</span>
          </span>
          {/* sr-only (no hidden): así el selector de archivo también se alcanza con teclado */}
          <input type="file" accept="image/*" capture="environment" className="sr-only" aria-label="Foto del ticket" onChange={handleFile} />
        </label>
      )}

      {state === "processing" && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Spinner color="current" className="text-foreground" />
          <p className="text-sm" role="status">Leyendo tu ticket…</p>
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AlertTriangle size={28} aria-hidden />
          <p className="text-sm max-w-[280px]" role="alert">{errorMsg}</p>
          <button type="button" className="btn soft" onClick={reset}>Intentar de nuevo</button>
        </div>
      )}

      {state === "review" && (
        <div className="flex flex-col gap-3">
          <p className="callout brand flex items-center gap-1.5 font-semibold">
            <Check size={14} aria-hidden /> Ticket leído. Revisa y confirma
          </p>
          <div className="f">
            <label htmlFor="scan-label">Comercio</label>
            <input id="scan-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="row2">
            <div className="f">
              <label htmlFor="scan-amount">Total</label>
              <input id="scan-amount" type="number" min="0" inputMode="decimal" placeholder="$ 0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="f">
              <label htmlFor="scan-date">Fecha</label>
              <input id="scan-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="f">
            <label htmlFor="scan-cat">Categoría</label>
            <Picker id="scan-cat" variant="field" label="Categoría" value={category} onChange={(v) => setCategory(v || "Otros")}
              options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </div>
        </div>
      )}

      <div className="ft">
        <button type="button" className="btn soft" onClick={close}>Cancelar</button>
        {state === "review" && (
          <button type="button" className="btn" disabled={!label.trim() || !amountValid} onClick={() => confirm(() => onOpenChange(false))}>
            <Check size={16} aria-hidden /> Registrar gasto
          </button>
        )}
      </div>
    </Sheet>
  );
}
