import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ClerkProvider } from '@clerk/nextjs'
import { PWARegister } from '@/components/PWARegister'

// Una sola familia con eje de ancho: condensada para los montos, normal para el resto
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

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
    { media: "(prefers-color-scheme: light)", color: "#eceee7" },
    { media: "(prefers-color-scheme: dark)", color: "#16131a" }
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
      <html lang="es" className={archivo.variable} suppressHydrationWarning>
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