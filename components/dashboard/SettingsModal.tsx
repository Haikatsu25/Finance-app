"use client";

import React from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, Input, Button } from "@heroui/react";
import { UserButton } from "@clerk/nextjs";
import {
  Fingerprint, Bell, BellOff, Users, LogOut, Trash2, Check, Copy, UserPlus,
  Tag, X, Plus, Download, Upload, Mic, CircleHelp,
} from "lucide-react";

type SetStrings = React.Dispatch<React.SetStateAction<string[]>>;

export function SettingsModal({
  isOpen, onOpenChange, onClearOpen,
  lockOn, bioAvailable, toggleBiometricLock,
  pushStatus, pushBusy, togglePush,
  isSharedMember, shareBusy, leaveShared, leaveArmed,
  members, removeMember, inviteCode, codeCopied, copyInvite, generateInvite,
  joinCode, setJoinCode, joinShared, shareError,
  customExpenseCats, setCustomExpenseCats, customIncomeCats, setCustomIncomeCats,
  newCatE, setNewCatE, newCatI, setNewCatI, addCustomCat,
  exportData, onImportFile, onVoiceOpen, onStartTour,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClearOpen: () => void;
  lockOn: boolean;
  bioAvailable: boolean;
  toggleBiometricLock: () => void;
  pushStatus: "on" | "off" | "denied" | "unsupported";
  pushBusy: boolean;
  togglePush: () => void;
  isSharedMember: boolean;
  shareBusy: boolean;
  leaveShared: () => void;
  leaveArmed: boolean;
  members: { userId: string; name?: string; email?: string }[];
  removeMember: (memberId: string) => void;
  inviteCode: string | null;
  codeCopied: boolean;
  copyInvite: () => void;
  generateInvite: () => void;
  joinCode: string;
  setJoinCode: (v: string) => void;
  joinShared: () => void;
  shareError: string | null;
  customExpenseCats: string[];
  setCustomExpenseCats: SetStrings;
  customIncomeCats: string[];
  setCustomIncomeCats: SetStrings;
  newCatE: string;
  setNewCatE: (v: string) => void;
  newCatI: string;
  setNewCatI: (v: string) => void;
  addCustomCat: (kind: "expense" | "income") => void;
  exportData: () => void;
  onImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onVoiceOpen: () => void;
  onStartTour: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} backdrop="blur">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">Ajustes</ModalHeader>
            <ModalBody className="pb-6">
              {/* ── Atajos que en móvil no caben en el encabezado ── */}
              <div className="flex flex-wrap items-center gap-2 sm:hidden">
                <Button variant="flat" startContent={<Mic size={16} />} onPress={() => { onClose(); onVoiceOpen(); }}>
                  Asistente de voz
                </Button>
                <Button variant="flat" startContent={<CircleHelp size={16} />} onPress={() => { onClose(); onStartTour(); }}>
                  Iniciar tour
                </Button>
                <UserButton />
              </div>

              {/* ── Seguridad ─────────────────────────────── */}
              <p className="text-sm font-bold text-default-700">Seguridad</p>
              <Button
                color={lockOn ? "success" : "default"}
                variant="flat"
                startContent={<Fingerprint size={18} />}
                isDisabled={!bioAvailable && !lockOn}
                onPress={toggleBiometricLock}
                className="justify-start"
              >
                {lockOn ? "Bloqueo biométrico: ACTIVADO (toca para quitar)" : "Activar bloqueo con huella / Face ID"}
              </Button>
              {!bioAvailable && !lockOn && (
                <p className="text-[11px] text-default-400 -mt-1">
                  Este dispositivo no tiene huella/Face ID disponible (o el sitio no está en HTTPS).
                </p>
              )}

              {/* ── Notificaciones ────────────────────────── */}
              <p className="text-sm font-bold text-default-700 mt-3">Recordatorios</p>
              <Button
                color={pushStatus === "on" ? "success" : "default"}
                variant="flat"
                startContent={pushStatus === "on" ? <Bell size={18} /> : <BellOff size={18} />}
                isDisabled={pushStatus === "unsupported" || pushStatus === "denied" || pushBusy}
                isLoading={pushBusy}
                onPress={togglePush}
                className="justify-start"
              >
                {pushStatus === "on" ? "Recordatorios: ACTIVADOS (toca para quitar)"
                  : pushStatus === "denied" ? "Notificaciones bloqueadas en el navegador"
                  : pushStatus === "unsupported" ? "Este navegador no soporta notificaciones"
                  : "Activar recordatorios de corte y pago"}
              </Button>
              <p className="text-[11px] text-default-400 -mt-1">
                Te avisamos 3 días antes, 1 día antes y el día de tu fecha límite de pago, y un día antes del corte.
              </p>

              {/* ── Cuentas compartidas ───────────────────── */}
              <p className="text-sm font-bold text-default-700 mt-3">Cuentas compartidas</p>

              {isSharedMember ? (
                <div className="p-3 rounded-lg bg-ink/5 border border-ink/20 space-y-2">
                  <p className="text-sm text-default-600 flex items-center gap-2">
                    <Users size={15} className="text-foreground shrink-0" />
                    Estás viendo <span className="font-bold">cuentas compartidas</span> de otra persona.
                  </p>
                  <p className="text-[11px] text-default-400">
                    Tus datos personales se conservan y regresan cuando salgas.
                  </p>
                  <Button
                    size="sm" color="danger" variant="flat"
                    startContent={<LogOut size={14} />}
                    isLoading={shareBusy}
                    onPress={leaveShared}
                  >
                    {leaveArmed ? "¿Seguro? Toca de nuevo para salir" : "Salir de estas cuentas"}
                  </Button>
                </div>
              ) : (
                <>
                  {members.length > 0 && (
                    <div className="space-y-1.5">
                      {members.map((m) => (
                        <div key={m.userId} className="flex items-center gap-2 p-2 rounded-lg bg-default-100 border border-default-200">
                          <Users size={13} className="text-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-default-700 truncate">{m.name || "Sin nombre"}</p>
                            {m.email && <p className="text-[10px] text-default-400 truncate">{m.email}</p>}
                          </div>
                          <button
                            onClick={() => removeMember(m.userId)}
                            className="p-1.5 rounded-lg text-default-500 hover:text-money-out-text hover:bg-money-out/10 transition-colors shrink-0"
                            aria-label={`Quitar a ${m.name || m.email || "miembro"}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {inviteCode ? (
                    <div className="p-3 rounded-lg bg-ink/5 border border-ink/20 space-y-1.5">
                      <p className="text-[11px] text-default-500">Comparte este código (vence en 72 h):</p>
                      <div className="flex items-center gap-2">
                        <span className="figure text-4xl tracking-[0.12em] text-foreground">
                          {inviteCode}
                        </span>
                        <Button isIconOnly size="sm" variant="flat" color={codeCopied ? "success" : "default"} onPress={copyInvite} aria-label="Copiar código">
                          {codeCopied ? <Check size={14} /> : <Copy size={14} />}
                        </Button>
                      </div>
                      <p className="text-[10px] text-default-400">
                        La otra persona lo ingresa en Ajustes → &quot;Unirme con código&quot; desde su propia cuenta.
                      </p>
                    </div>
                  ) : (
                    <Button
                      variant="flat" color="primary"
                      startContent={<UserPlus size={16} />}
                      isLoading={shareBusy}
                      onPress={generateInvite}
                      className="justify-start"
                    >
                      Invitar a alguien (generar código)
                    </Button>
                  )}

                  {members.length === 0 && (
                    <div className="flex gap-2">
                      <Input
                        size="sm" variant="bordered" placeholder="Código de invitación"
                        aria-label="Código de invitación"
                        value={joinCode}
                        onValueChange={(v) => setJoinCode(v.toUpperCase())}
                        maxLength={6}
                        classNames={{ input: joinCode ? "uppercase tracking-widest font-bold" : "" }} /* el código se escribe en mayúsculas; el texto de ayuda no */
                        className="flex-1"
                      />
                      <Button
                        size="sm" variant="flat" color="secondary" className="font-bold"
                        isDisabled={joinCode.trim().length !== 6}
                        isLoading={shareBusy}
                        onPress={joinShared}
                      >
                        Unirme
                      </Button>
                    </div>
                  )}

                  {shareError && <p className="text-[11px] text-money-out-text font-semibold">{shareError}</p>}
                </>
              )}

              {/* ── Categorías personalizadas ──────────────── */}
              <p className="text-sm font-bold text-default-700 mt-3">Categorías personalizadas</p>
              {([
                { kind: "expense" as const, label: "Para gastos", list: customExpenseCats, setter: setCustomExpenseCats, value: newCatE, setValue: setNewCatE },
                { kind: "income" as const, label: "Para ingresos", list: customIncomeCats, setter: setCustomIncomeCats, value: newCatI, setValue: setNewCatI },
              ]).map(({ kind, label: catLabel, list, setter, value, setValue }) => (
                <div key={kind} className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-default-500">{catLabel}</p>
                  {list.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {list.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full bg-ink/5 text-foreground border border-ink/20">
                          <Tag size={10} />
                          {c}
                          <button onClick={() => setter((prev) => prev.filter((x) => x !== c))} aria-label={`Quitar ${c}`} className="hover:text-money-out-text ml-0.5">
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input size="sm" variant="bordered" placeholder={kind === "expense" ? "Ej. Mascota, Gym" : "Ej. Propinas"}
                      value={value} onValueChange={setValue}
                      onKeyDown={(e) => { if (e.key === "Enter") addCustomCat(kind); }}
                      className="flex-1" aria-label={`Nueva categoría ${catLabel}`} />
                    <Button size="sm" variant="flat" color="primary" isIconOnly isDisabled={!value.trim()}
                      onPress={() => addCustomCat(kind)} aria-label="Agregar categoría">
                      <Plus size={14} />
                    </Button>
                  </div>
                </div>
              ))}

              {/* ── Datos ─────────────────────────────────── */}
              <p className="text-sm font-bold text-default-700 mt-3">Datos</p>
              <p className="text-sm text-default-500 mb-2">
                Exporta tus datos como un archivo JSON de respaldo, o importa un archivo previamente exportado.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  color="primary"
                  variant="flat"
                  startContent={<Download size={18} />}
                  onPress={() => { exportData(); onClose(); }}
                >
                  Exportar Respaldo (.json)
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".json,application/json"
                    aria-label="Importar respaldo"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                    onChange={(e) => { onImportFile(e); onClose(); }}
                  />
                  <Button
                    color="secondary"
                    variant="flat"
                    startContent={<Upload size={18} />}
                    className="w-full pointer-events-none"
                  >
                    Importar Respaldo
                  </Button>
                </div>
                <Button
                  color="danger"
                  variant="flat"
                  startContent={<Trash2 size={18} />}
                  onPress={() => { onClose(); onClearOpen(); }}
                >
                  Limpiar Historial
                </Button>
              </div>

              <a href="/privacidad" target="_blank" rel="noopener"
                className="text-[11px] text-default-500 hover:text-foreground underline underline-offset-2 mt-2">
                Aviso de privacidad
              </a>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
