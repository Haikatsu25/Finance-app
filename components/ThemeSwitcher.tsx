"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Botón de modo noche (círculo de 44px). Antes era un interruptor de HeroUI. */
export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <span className="top-icon" aria-hidden />;

  const night = resolvedTheme === "dark";
  return (
    <button
      type="button"
      className="top-icon"
      aria-pressed={night}
      aria-label="Modo noche"
      title="Modo noche"
      onClick={() => setTheme(night ? "light" : "dark")}
    >
      {night ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </button>
  );
}
