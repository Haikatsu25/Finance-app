// El servidor corre en UTC; "hoy" para avisos y para el asistente de IA es el día de México.
process.env.TZ = "UTC"; // antes de crear cualquier Date: simula el servidor

import test from "node:test";
import assert from "node:assert/strict";
import { todayInZone, wallClock } from "@/lib/finance-utils";
import { buildReminders, buildRemindersAt } from "@/lib/reminders";

// 21:30 del 6 de octubre en México = 03:30 UTC del 7
const NOCHE = new Date("2026-10-07T03:30:00.000Z");

test("el proceso corre en UTC (la prueba reproduce el servidor)", () => {
  assert.equal(new Date(NOCHE).getDate(), 7);
});

test("wallClock da el reloj de pared de México", () => {
  const w = wallClock(NOCHE);
  assert.deepEqual([w.getFullYear(), w.getMonth() + 1, w.getDate(), w.getHours(), w.getMinutes()], [2026, 10, 6, 21, 30]);
});

test("todayInZone (lo que usa el chat de IA): 6 de octubre, no 7", () => {
  assert.equal(todayInZone(NOCHE), "2026-10-06");
  assert.equal(todayInZone(new Date("2026-10-07T06:00:00.000Z")), "2026-10-07"); // 00:00 en México
});

test("buildRemindersAt cuenta los días desde el hoy de México", () => {
  // Pago el día 9: desde el 6 faltan 3 días ("pago en 3 días"); desde el 7 (UTC) serían 2 y no avisaría
  const cards = [{ id: "c1", label: "BBVA", balance: 1000, dueDay: 9, cutoffDay: 20 }];
  const titulos = buildRemindersAt(cards, [], NOCHE).map((r) => r.title);
  assert.deepEqual(titulos, ["💳 BBVA: pago en 3 días"]);
  // con el Date UTC crudo (el comportamiento anterior) el aviso se corría un día
  assert.deepEqual(buildReminders(cards, [], NOCHE).map((r) => r.title), []);
});
