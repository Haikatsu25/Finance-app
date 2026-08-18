import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ClerkProvider } from '@clerk/nextjs'
import { PWARegister } from '@/components/PWARegister'

const inter = Inter({ subsets: ["latin"] });

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
    { media: "(prefers-color-scheme: light)", color: "#f6f8fb" },
    { media: "(prefers-color-scheme: dark)", color: "#060c16" }
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
      <html lang="es" suppressHydrationWarning>
        <body className={inter.className}>
          <Providers>
            {children}
          </Providers>
          <PWARegister />
        </body>
      </html>
    </ClerkProvider>
  );
}