"use client";

import React from "react";
import { useTheme } from "next-themes";
import { UserButton } from "@clerk/nextjs";
import {
  Users, LogOut, Trash2, Check, Copy, UserPlus,
  Tag, X, Plus, Download, Upload, Mic, CircleHelp,
} from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";

type SetStrings = React.Dispatch<React.SetStateAction<string[]>>;

function Switch({ on, onToggle, label, disabled }: { on: boolean; onToggle: () => void; label: string; disabled?: boolean }) {
  return (
    <button type="button" className="sw" role="switch" aria-checked={on} aria-label={label} onClick={onToggle} disabled={disabled} />
  );
}

export function SettingsModal({
  isOpen, onOpenChange, onClearOpen,
  lockOn, bioAvailable, toggleBiometricLock,
  pushStatus, pushBusy, togglePush,
  privacy, onTogglePrivacy,
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
  privacy: boolean;
  onTogglePrivacy: () => void;
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
  const { resolvedTheme, setTheme } = useTheme();
  const night = resolvedTheme === "dark";
  const close = () => onOpenChange(false);

  const pushLabel =
    pushStatus === "denied" ? "Notificaciones bloqueadas en el navegador"
    : pushStatus === "unsupported" ? "Este navegador no soporta notificaciones"
    : "3 días antes, 1 día antes y el día límite; y un día antes del corte";

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange} title="Ajustes" wide>
      {/* ── Preferencias ─────────────────────────────── */}
      <div>
        <div className="setrow">
          <div><b>Ocultar montos</b><small>Muestra $•••• en toda la app</small></div>
          <Switch on={privacy} onToggle={onTogglePrivacy} label="Ocultar montos" />
        </div>
        <div className="setrow">
          <div><b>Modo noche</b><small>Fondo negro y halo lima</small></div>
          <Switch on={night} onToggle={() => setTheme(night ? "light" : "dark")} label="Modo noche" />
        </div>
        <div className="setrow">
          <div><b>Recordatorios de corte y pago</b><small>{pushLabel}</small></div>
          <Switch
            on={pushStatus === "on"} onToggle={togglePush} label="Recordatorios de corte y pago"
            disabled={pushStatus === "unsupported" || pushStatus === "denied" || pushBusy}
          />
        </div>
        <div className="setrow">
          <div>
            <b>Bloqueo con huella o Face ID</b>
            <small>
              {!bioAvailable && !lockOn
                ? "Este dispositivo no tiene huella o Face ID disponible (o el sitio no está en HTTPS)"
                : "Al abrir la app"}
            </small>
          </div>
          <Switch on={lockOn} onToggle={toggleBiometricLock} label="Bloqueo con huella o Face ID" disabled={!bioAvailable && !lockOn} />
        </div>
      </div>

      {/* ── Atajos que en móvil no caben en el encabezado ── */}
      <div className="flex flex-wrap items-center gap-2 sm:hidden">
        <button type="button" className="btn soft sm" onClick={() => { close(); onVoiceOpen(); }}>
          <Mic size={16} aria-hidden /> Asistente de voz
        </button>
        <button type="button" className="btn soft sm" onClick={() => { close(); onStartTour(); }}>
          <CircleHelp size={16} aria-hidden /> Iniciar tour
        </button>
        <UserButton />
      </div>

      {/* ── Cuentas compartidas ──────────────────────── */}
      <div className="flex flex-col gap-2.5">
        <h3 className="sec" style={{ fontSize: 14 }}>Cuentas compartidas</h3>

        {isSharedMember ? (
          <div className="callout flex flex-col gap-2">
            <p className="flex items-center gap-2">
              <Users size={15} className="shrink-0" aria-hidden />
              <span>Estás viendo <b>cuentas compartidas</b> de otra persona.</span>
            </p>
            <p className="mute text-xs">Tus datos personales se conservan y regresan cuando salgas.</p>
            <button type="button" className="btn danger sm self-start" onClick={leaveShared} disabled={shareBusy}>
              <LogOut size={14} aria-hidden /> {leaveArmed ? "¿Seguro? Toca de nuevo para salir" : "Salir de estas cuentas"}
            </button>
          </div>
        ) : (
          <>
            {members.length > 0 && (
              <div className="list">
                {members.map((m) => (
                  <div key={m.userId} className="it">
                    <i aria-hidden><Users size={16} /></i>
                    <div className="t">
                      <b>{m.name || "Sin nombre"}</b>
                      {m.email && <small>{m.email}</small>}
                    </div>
                    <div className="acts">
                      <button onClick={() => removeMember(m.userId)} aria-label={`Quitar a ${m.name || m.email || "miembro"}`}>
                        <Trash2 size={15} aria-hidden />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {inviteCode ? (
              <div className="callout flex flex-col gap-1.5">
                <p className="text-xs mute">Comparte este código (vence en 72 h):</p>
                <div className="flex items-center gap-2">
                  <span className="figure text-4xl tracking-[0.12em]">{inviteCode}</span>
                  <button type="button" className="btn soft sm" onClick={copyInvite} aria-label="Copiar código">
                    {codeCopied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                  </button>
                </div>
                <p className="text-[0.6875rem] mute">La otra persona lo ingresa en Ajustes, en «Unirme con código», desde su propia cuenta.</p>
              </div>
            ) : (
              <button type="button" className="btn ghost sm self-start" onClick={generateInvite} disabled={shareBusy}>
                <UserPlus size={16} aria-hidden /> Invitar a alguien (generar código)
              </button>
            )}

            {members.length === 0 && (
              <div className="flex gap-2">
                <input
                  className="field-pill flex-1" placeholder="Código de invitación" aria-label="Código de invitación"
                  value={joinCode} maxLength={6}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  style={joinCode ? { letterSpacing: "0.1em", fontWeight: 700 } : undefined}
                />
                <button type="button" className="btn ghost sm" disabled={joinCode.trim().length !== 6 || shareBusy} onClick={joinShared}>
                  Unirme
                </button>
              </div>
            )}

            {shareError && <p className="err-msg">{shareError}</p>}
          </>
        )}
      </div>

      {/* ── Categorías personalizadas ────────────────── */}
      <div className="flex flex-col gap-3">
        <h3 className="sec" style={{ fontSize: 14 }}>Categorías personalizadas</h3>
        {([
          { kind: "expense" as const, label: "Para gastos", list: customExpenseCats, setter: setCustomExpenseCats, value: newCatE, setValue: setNewCatE },
          { kind: "income" as const, label: "Para ingresos", list: customIncomeCats, setter: setCustomIncomeCats, value: newCatI, setValue: setNewCatI },
        ]).map(({ kind, label: catLabel, list, setter, value, setValue }) => (
          <div key={kind} className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold mute">{catLabel}</p>
            {list.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {list.map((c) => (
                  <span key={c} className="chip inline-flex items-center gap-1">
                    <Tag size={11} aria-hidden />
                    {c}
                    <button
                      onClick={() => setter((prev) => prev.filter((x) => x !== c))} aria-label={`Quitar ${c}`}
                      className="grid place-items-center size-9 -my-2 -mr-2 rounded-full"
                    >
                      <X size={12} aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="field-pill flex-1" placeholder={kind === "expense" ? "Ej. Mascota, Gym" : "Ej. Propinas"}
                aria-label={`Nueva categoría ${catLabel}`}
                value={value} onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCustomCat(kind); }}
              />
              <button type="button" className="btn ghost sm" style={{ minWidth: 44 }} disabled={!value.trim()}
                onClick={() => addCustomCat(kind)} aria-label="Agregar categoría">
                <Plus size={16} aria-hidden />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── Datos ────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        <h3 className="sec" style={{ fontSize: 14 }}>Datos</h3>
        <p className="mute text-sm">
          Exporta tus datos como un archivo JSON de respaldo, o importa un archivo previamente exportado.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn soft sm" onClick={() => { exportData(); close(); }}>
            <Download size={16} aria-hidden /> Exportar respaldo (.json)
          </button>
          <div className="relative">
            <input
              type="file" accept=".json,application/json" aria-label="Importar respaldo"
              className="absolute inset-0 z-10 size-full cursor-pointer opacity-0"
              onChange={(e) => { onImportFile(e); close(); }}
            />
            <span className="btn soft sm pointer-events-none">
              <Upload size={16} aria-hidden /> Importar respaldo
            </span>
          </div>
        </div>
      </div>

      <div className="ft">
        <button type="button" className="btn danger sm" onClick={() => { close(); onClearOpen(); }}>
          <Trash2 size={16} aria-hidden /> Limpiar historial
        </button>
        <button type="button" className="btn" onClick={close}>Listo</button>
      </div>
    </Sheet>
  );
}
