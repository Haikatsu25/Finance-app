import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ClerkProvider } from '@clerk/nextjs'
import { PWARegister } from '@/components/PWARegister'

// Plus Jakarta Sans en todo (400–800); los montos usan cifras tabulares
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: "Finance Control — Gestión Financiera Inteligente",
  description: "Controla tus activos, gastos y apartados con analíticas avanzadas e Inteligencia Artificial.",
  manifest: "/manifest.json",
  // Instalación en iOS: sin barra del navegador y con icono propio
  appleWebApp: {
    capable: true,
    title: "Finance",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c12" }
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="es" className={jakarta.variable} suppressHydrationWarning>
        <body>
          <Providers>
            {children}
          </Providers>
          <PWARegister />
        </body>
      </html>
    </ClerkProvider>
  );
}