// Cliente de notificaciones push: suscribe este navegador/dispositivo.

function urlB64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSupported(): boolean {
    return typeof window !== "undefined"
        && "serviceWorker" in navigator
        && "PushManager" in window
        && "Notification" in window;
}

export async function getPushStatus(): Promise<"on" | "off" | "denied" | "unsupported"> {
    if (!pushSupported()) return "unsupported";
    if (Notification.permission === "denied") return "denied";
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        return sub ? "on" : "off";
    } catch {
        return "off";
    }
}

export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
    if (!pushSupported()) return { ok: false, reason: "unsupported" };

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) return { ok: false, reason: "no_vapid" };

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };

    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(vapidKey) as BufferSource,
        });
        const res = await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sub.toJSON()),
        });
        if (!res.ok) return { ok: false, reason: "server" };
        return { ok: true };
    } catch (err) {
        console.warn("enablePush failed:", err);
        return { ok: false, reason: "error" };
    }
}

export async function disablePush(): Promise<void> {
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            await fetch("/api/push/subscribe", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endpoint: sub.endpoint }),
            }).catch(() => {});
            await sub.unsubscribe();
        }
    } catch { /* noop */ }
}
