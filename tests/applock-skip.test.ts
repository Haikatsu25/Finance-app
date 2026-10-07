// "Entrar con mi cuenta": la marca fc_lock_skip_once salta el candado una sola vez.
import test from "node:test";
import assert from "node:assert/strict";
import {
  LOCK_SKIP_KEY, clearLockSkipOnce, consumeLockSkipOnce, markLockSkipOnce, shouldStartLocked,
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

test("sin marca no se salta el candado", () => {
  const s = fakeStorage();
  assert.equal(consumeLockSkipOnce(s), false);
});

test("con marca: se salta el candado y la marca se borra", () => {
  const s = fakeStorage();
  markLockSkipOnce(s);
  assert.equal(s.has(LOCK_SKIP_KEY), true);
  assert.equal(consumeLockSkipOnce(s), true);
  assert.equal(s.has(LOCK_SKIP_KEY), false);
});

test("la marca es de una sola vez: la segunda lectura ya no la encuentra", () => {
  const s = fakeStorage();
  markLockSkipOnce(s);
  assert.equal(consumeLockSkipOnce(s), true);
  assert.equal(consumeLockSkipOnce(s), false);
});

test("mientras no se consume (Clerk aún sin confirmar la sesión) la marca sigue ahí", () => {
  // el Dashboard solo llama a consumeLockSkipOnce con isLoaded && isSignedIn: una carga
  // intermedia (sso-callback) que no lo llama no gasta la marca
  const s = fakeStorage();
  markLockSkipOnce(s);
  assert.equal(s.has(LOCK_SKIP_KEY), true);
  assert.equal(consumeLockSkipOnce(s), true);
});

test("shouldStartLocked: con candado y sin marca abre bloqueado; con marca o sin candado, no", () => {
  assert.equal(shouldStartLocked(true, false), true);
  assert.equal(shouldStartLocked(true, true), false);
  assert.equal(shouldStartLocked(false, false), false);
  assert.equal(shouldStartLocked(false, true), false);
});

test("clearLockSkipOnce borra la marca sin consumirla", () => {
  const s = fakeStorage();
  markLockSkipOnce(s);
  clearLockSkipOnce(s);
  assert.equal(s.has(LOCK_SKIP_KEY), false);
});
