// Entorno de las pruebas E2E: DNS, .env.local y salvaguardas.
import dns from "node:dns";
import { loadEnvConfig } from "@next/env";

dns.setServers(["8.8.8.8", "1.1.1.1"]); // ver tests/e2e/dns-fix.cjs
loadEnvConfig(process.cwd(), true, { info() {}, error() {} });

/**
 * Usuario de prueba (plan: docs/e2e-plan.md). El subdirección +clerk_test permite el código 424242.
 * El plan decía @finance-control.test, pero Clerk rechaza ese dominio (422 form_param_format_invalid);
 * example.com es el dominio reservado para pruebas que usa su propia documentación.
 */
export const TEST_EMAIL = "e2e+clerk_test@example.com";
export const BASE_URL = "http://localhost:3000";

/** Nombre de la base de datos que trae la URI (o null si no trae). */
export function dbNameOf(uri: string | undefined): string | null {
  return (/^mongodb(?:\+srv)?:\/\/[^/?]+\/([^?]*)/.exec(uri ?? "") || [])[1] || null;
}

/**
 * Salvaguardas: estas pruebas BORRAN el documento de finanzas del usuario de prueba, así que solo
 * corren contra una base llamada `finance-test` y con llaves de desarrollo de Clerk.
 */
export function assertSafeEnvironment(): void {
  const db = dbNameOf(process.env.MONGODB_URI);
  if (db !== "finance-test") {
    throw new Error(`E2E abortado: MONGODB_URI apunta a la base "${db}", no a "finance-test". No se toca nada.`);
  }
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
  const sk = process.env.CLERK_SECRET_KEY ?? "";
  if (!pk.startsWith("pk_test_") || !sk.startsWith("sk_test_")) {
    throw new Error("E2E abortado: hacen falta llaves de desarrollo de Clerk (pk_test_ / sk_test_) en .env.local.");
  }
}
