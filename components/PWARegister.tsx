"use client";

import { useEffect } from "react";

/** Registra el service worker para que la app sea instalable y aguante sin red. */
export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("SW registration failed:", err);
      });
    }
  }, []);
  return null;
}
