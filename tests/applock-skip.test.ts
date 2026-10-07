// "Entrar con mi cuenta": la marca fc_lock_skip_once salta el candado una sola vez.
import test from "node:test";
import assert from "node:assert/strict";
import {
  LOCK_SKIP_KEY, clearLockSkipOnce, consumeLockSkipOnce, markLockSkipOnce, resetLockSkipCache, shouldStartLocked,
} from "@/lib/applock";

function fakeStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    has: (k: string) => m.has(k),
  };
}

test("sin marca, el candado activado abre bloqueado", () => {
  resetLockSkipCache();
  const s = fakeStorage();
  assert.equal(consumeLockSkipOnce(s), false);
  assert.equal(shouldStartLocked(true, false), true);
});

test("con marca: se salta el candado y la marca se borra", () => {
  resetLockSkipCache();
  const s = fakeStorage();
  markLockSkipOnce(s);
  assert.equal(s.has(LOCK_SKIP_KEY), true);
  const skip = consumeLockSkipOnce(s);
  assert.equal(skip, true);
  assert.equal(s.has(LOCK_SKIP_KEY), false);
  assert.equal(shouldStartLocked(true, skip), false);
});

test("el doble montaje (StrictMode) da el mismo resultado aunque la marca ya se borró", () => {
  resetLockSkipCache();
  const s = fakeStorage();
  markLockSkipOnce(s);
  assert.equal(consumeLockSkipOnce(s), true);
  assert.equal(consumeLockSkipOnce(s), true); // segundo montaje: la marca ya no está, pero se recuerda
});

test("la marca es de una sola vez: la siguiente carga vuelve a bloquear", () => {
  resetLockSkipCache();
  const s = fakeStorage();
  markLockSkipOnce(s);
  consumeLockSkipOnce(s);
  resetLockSkipCache(); // otra carga de la página
  const skip = consumeLockSkipOnce(s);
  assert.equal(skip, false);
  assert.equal(shouldStartLocked(true, skip), true);
});

test("sin candado activado nunca abre bloqueado, haya marca o no", () => {
  assert.equal(shouldStartLocked(false, false), false);
  assert.equal(shouldStartLocked(false, true), false);
});

test("clearLockSkipOnce borra la marca sin consumirla", () => {
  resetLockSkipCache();
  const s = fakeStorage();
  markLockSkipOnce(s);
  clearLockSkipOnce(s);
  assert.equal(s.has(LOCK_SKIP_KEY), false);
});
