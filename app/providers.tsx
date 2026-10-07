// app/providers.tsx
"use client";

import { HeroUIProvider } from '@heroui/react'
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // locale: los textos de los componentes de HeroUI (calendario, "Cerrar", mes y días) salían en inglés
    <HeroUIProvider locale="es-MX">
      <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </NextThemesProvider>
    </HeroUIProvider>
  )
}