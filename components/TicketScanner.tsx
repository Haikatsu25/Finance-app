"use client";

import React, { useState } from "react";
import {
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem, Spinner,
} from "@heroui/react";
import { ScanLine, Camera, Check, AlertTriangle } from "lucide-react";
import { TransactionItem } from "@/types";
import { round2 } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "./Transactions";

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
      date: date || new Date().toISOString().split("T")[0],
      type: "expense",
      category,
      source: "scan",
    });
    reset();
    close();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }} backdrop="blur" placement="center">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-2">
              <ScanLine size={18} className="text-purple-500" />
              Escanear ticket
            </ModalHeader>
            <ModalBody className="pb-2">
              {state === "idle" && (
                <label className="flex flex-col items-center justify-center gap-3 py-10 border-2 border-dashed border-purple-500/30 rounded-2xl cursor-pointer hover:bg-purple-500/5 transition-colors">
                  <div className="p-3 rounded-2xl bg-purple-500/12">
                    <Camera size={24} className="text-purple-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">Toma o sube la foto del ticket</p>
                    <p className="text-[11px] text-default-400 mt-1">La IA lee el comercio, el total y la fecha por ti</p>
                  </div>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
                </label>
              )}

              {state === "processing" && (
                <div className="flex flex-col items-center gap-3 py-10">
                  <Spinner color="secondary" />
                  <p className="text-sm text-default-500">Leyendo tu ticket…</p>
                </div>
              )}

              {state === "error" && (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <AlertTriangle size={26} className="text-amber-500" />
                  <p className="text-sm text-default-500 max-w-[280px]">{errorMsg}</p>
                  <Button size="sm" variant="flat" color="secondary" onPress={reset}>Intentar de nuevo</Button>
                </div>
              )}

              {state === "review" && (
                <div className="space-y-3">
                  <p className="text-[11px] text-default-400 flex items-center gap-1">
                    <Check size={12} className="text-emerald-500" /> Ticket leído — revisa y confirma
                  </p>
                  <Input label="Comercio" size="sm" variant="bordered" value={label} onValueChange={setLabel} />
                  <div className="flex gap-2">
                    <Input label="Total" type="number" min="0" inputMode="decimal" size="sm" variant="bordered"
                      startContent={<span className="text-default-400 text-xs">$</span>}
                      value={amount} onValueChange={setAmount} className="flex-1" />
                    <Input label="Fecha" type="date" size="sm" variant="bordered" value={date} onValueChange={setDate} className="w-[150px]" />
                  </div>
                  <Select label="Categoría" size="sm" variant="bordered"
                    selectedKeys={[category]} onChange={(e) => setCategory(e.target.value || "Otros")}>
                    {EXPENSE_CATEGORIES.map((c) => <SelectItem key={c}>{c}</SelectItem>)}
                  </Select>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>Cancelar</Button>
              {state === "review" && (
                <Button color="secondary" variant="shadow" className="font-bold bg-purple-500"
                  isDisabled={!label.trim() || !amountValid}
                  startContent={<Check size={15} />}
                  onPress={() => confirm(onClose)}>
                  Registrar gasto
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
