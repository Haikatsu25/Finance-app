import mongoose from "mongoose";
import { assertSafeEnvironment } from "../env";

/**
 * Borra el documento de finanzas de un usuario en `finance-test` (colección `finances`).
 * Se niega a correr contra cualquier otra base. Devuelve cuántos documentos borró.
 */
export async function resetFinance(userId: string | undefined = process.env.E2E_USER_ID): Promise<number> {
  assertSafeEnvironment();
  if (!userId) throw new Error("resetFinance: falta el userId del usuario de prueba");
  const conn = await mongoose.createConnection(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 20_000 }).asPromise();
  try {
    if (conn.name !== "finance-test") throw new Error(`resetFinance: conectó a "${conn.name}", no a finance-test`);
    const res = await conn.db!.collection("finances").deleteMany({ userId });
    return res.deletedCount;
  } finally {
    await conn.close();
  }
}

/** Lee el documento de finanzas del usuario de prueba (solo lectura), para comprobar qué quedó guardado. */
export async function readFinance(userId: string | undefined = process.env.E2E_USER_ID): Promise<any | null> {
  assertSafeEnvironment();
  const conn = await mongoose.createConnection(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 20_000 }).asPromise();
  try {
    return await conn.db!.collection("finances").findOne({ userId });
  } finally {
    await conn.close();
  }
}
