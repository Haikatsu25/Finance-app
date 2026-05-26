import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ClerkProvider } from '@clerk/nextjs'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finance Control — Gestión Financiera Inteligente",
  description: "Controla tus activos, gastos y apartados con analíticas avanzadas e Inteligencia Artificial.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" }
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        </body>
      </html>
    </ClerkProvider>
  );
}