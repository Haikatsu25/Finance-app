// Bloqueo biométrico local con WebAuthn (huella / Face ID / Windows Hello).
// Es un CANDADO DE PANTALLA en este dispositivo: la sesión de Clerk sigue
// siendo la autenticación real. Requiere HTTPS (o localhost).

const CRED_KEY = "fc_lock_cred";
const ENABLED_KEY = "fc_lock_on";

function randomChallenge(): Uint8Array {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return arr;
}

function bufToB64(buf: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64ToBuf(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function biometricsAvailable(): Promise<boolean> {
    try {
        if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
}

export function isLockEnabled(): boolean {
    try {
        return typeof window !== "undefined"
            && localStorage.getItem(ENABLED_KEY) === "1"
            && !!localStorage.getItem(CRED_KEY);
    } catch {
        return false;
    }
}

/** Registra la huella/rostro del dispositivo y activa el candado. */
export async function enableLock(userName: string): Promise<boolean> {
    try {
        const userId = new Uint8Array(16);
        crypto.getRandomValues(userId);
        const cred = (await navigator.credentials.create({
            publicKey: {
                challenge: randomChallenge() as BufferSource,
                rp: { name: "Finance Control", id: window.location.hostname },
                user: {
                    id: userId as BufferSource,
                    name: userName || "usuario",
                    displayName: userName || "Usuario",
                },
                pubKeyCredParams: [
                    { type: "public-key", alg: -7 },   // ES256
                    { type: "public-key", alg: -257 }, // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required",
                    residentKey: "discouraged",
                },
                timeout: 60_000,
                attestation: "none",
            },
        })) as PublicKeyCredential | null;

        if (!cred) return false;
        localStorage.setItem(CRED_KEY, bufToB64(cred.rawId));
        localStorage.setItem(ENABLED_KEY, "1");
        return true;
    } catch (err) {
        console.warn("enableLock failed:", err);
        return false;
    }
}

export function disableLock() {
    try {
        localStorage.removeItem(CRED_KEY);
        localStorage.removeItem(ENABLED_KEY);
    } catch { /* noop */ }
}

/** Pide la huella/rostro. true = desbloqueado. */
export async function verifyLock(): Promise<boolean> {
    try {
        const credId = localStorage.getItem(CRED_KEY);
        if (!credId) return true; // sin candado configurado
        const assertion = await navigator.credentials.get({
            publicKey: {
                challenge: randomChallenge() as BufferSource,
                allowCredentials: [{
                    type: "public-key",
                    id: b64ToBuf(credId) as BufferSource,
                    transports: ["internal"],
                }],
                userVerification: "required",
                timeout: 60_000,
            },
        });
        return !!assertion;
    } catch (err) {
        console.warn("verifyLock failed:", err);
        return false;
    }
}

// ── Entrar con la cuenta en vez de la huella ────────────────────────────────
// "Entrar con mi cuenta" cierra la sesión de Clerk para volver a iniciar con Google o correo. El
// candado (fc_lock_on) sigue activado; esta marca solo evita que, al volver a entrar, la app
// abra otra vez bloqueada. Vive en sessionStorage y se consume UNA vez por carga de la página.

export const LOCK_SKIP_KEY = "fc_lock_skip_once";

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Guarda la marca antes de cerrar sesión. */
export function markLockSkipOnce(storage: KV | undefined = safeSession()) {
    try { storage?.setItem(LOCK_SKIP_KEY, "1"); } catch { /* noop */ }
}

/** Borra la marca (por ejemplo, cuando se vuelve a iniciar sesión sin recargar). */
export function clearLockSkipOnce(storage: KV | undefined = safeSession()) {
    try { storage?.removeItem(LOCK_SKIP_KEY); } catch { /* noop */ }
}

let skipCache: boolean | null = null;

/**
 * ¿Hay que saltarse el candado en esta carga? Lee y borra la marca. Con el doble montaje de
 * StrictMode el efecto corre dos veces: el resultado se recuerda para que ambas den lo mismo.
 */
export function consumeLockSkipOnce(storage: KV | undefined = safeSession()): boolean {
    if (skipCache !== null) return skipCache;
    let skip = false;
    try {
        skip = storage?.getItem(LOCK_SKIP_KEY) === "1";
        if (skip) storage?.removeItem(LOCK_SKIP_KEY);
    } catch { /* noop */ }
    skipCache = skip;
    return skip;
}

/** Solo para pruebas: olvida el resultado recordado de consumeLockSkipOnce. */
export function resetLockSkipCache() { skipCache = null; }

/** ¿La app debe abrir bloqueada? Candado activado y sin marca de "entrar con mi cuenta". */
export function shouldStartLocked(lockEnabled: boolean, skipOnce: boolean): boolean {
    return lockEnabled && !skipOnce;
}

function safeSession(): KV | undefined {
    try { return typeof window === "undefined" ? undefined : window.sessionStorage; } catch { return undefined; }
}
