"use client";

import { useUser } from "@clerk/nextjs";
import { Fingerprint, LogIn } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

/**
 * Pantalla de entrada con candado. La huella o el rostro solo se piden al tocar el botón (nunca al
 * montar). Si no hay biometría en el dispositivo, "Entrar con mi cuenta" pasa a ser el botón principal.
 */
export function BiometricLockScreen({ unlocking, bioAvailable, bioChecked, failed, onUnlock, onUseAccount }: {
  unlocking: boolean;
  /** false mientras se consulta si hay biometría: los botones esperan para no mostrar uno equivocado */
  bioChecked: boolean;
  /** biometricsAvailable(): si es false se oculta el botón de huella */
  bioAvailable: boolean;
  /** El sistema canceló o no pudo verificar la huella/rostro */
  failed: boolean;
  onUnlock: () => void;
  /** Cierra la sesión de Clerk para entrar con Google o correo */
  onUseAccount: () => void;
}) {
  const { user } = useUser();
  const first = user?.firstName || user?.username || "";
  const shown = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || "";

  return (
    <div
      className="fixed inset-0 z-[100] hero-card overflow-y-auto overscroll-none"
      role="dialog" aria-modal="true" aria-label="Pantalla de entrada"
    >
      <div className="min-h-full flex flex-col items-center justify-center gap-6 px-6 py-8">
        <Logo size={44} />

        <div className="flex flex-col items-center gap-3 text-center">
          {user?.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.imageUrl} alt="" width={72} height={72}
              className="size-[4.5rem] rounded-full border-2 border-white/25 object-cover"
            />
          )}
          <h2 className="text-[1.375rem] font-black text-white break-words max-w-[18rem]">
            {first ? `Hola, ${first}` : "Hola de nuevo"}
          </h2>
          {shown && <p className="text-sm text-white/60 break-words max-w-[18rem]">{shown}</p>}
        </div>

        <div className={`w-full max-w-[20rem] flex flex-col gap-3 ${bioChecked ? "" : "invisible"}`} aria-hidden={!bioChecked}>
          {bioAvailable ? (
            <>
              <button
                type="button" className="lock-btn lock-btn-main" onClick={onUnlock} disabled={unlocking}
                aria-busy={unlocking}
              >
                <Fingerprint size={20} aria-hidden />
                <span>{unlocking ? "Verificando…" : "Usar huella o rostro"}</span>
              </button>
              {failed && (
                <p role="alert" className="text-sm text-center text-white/80">
                  No se pudo verificar. Intenta de nuevo o entra con tu cuenta.
                </p>
              )}
              <button type="button" className="lock-btn lock-btn-ghost" onClick={onUseAccount}>
                <LogIn size={18} aria-hidden />
                <span>Entrar con mi cuenta</span>
              </button>
            </>
          ) : (
            <button type="button" className="lock-btn lock-btn-main" onClick={onUseAccount}>
              <LogIn size={18} aria-hidden />
              <span>Entrar con mi cuenta</span>
            </button>
          )}
        </div>

        <button type="button" className="lock-link" onClick={onUseAccount}>
          ¿No eres tú? Cambiar de cuenta
        </button>
      </div>
    </div>
  );
}
