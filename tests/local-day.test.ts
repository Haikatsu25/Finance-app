// "Hoy" y el día de un snapshot se calculan en la zona del usuario, no en UTC.
process.env.TZ = "America/Mexico_City"; // antes de crear cualquier Date

import test from "node:test";
import assert from "node:assert/strict";
import { localDay, todayIso } from "@/lib/finance-utils";

test("un instante UTC de la madrugada del día siguiente sigue siendo el día local anterior", () => {
  assert.equal(localDay("2026-10-07T03:30:00.000Z"), "2026-10-06");
});

test("una fecha YYYY-MM-DD se devuelve tal cual", () => {
  assert.equal(localDay("2026-10-07"), "2026-10-07");
});

test("todayIso usa el día local aunque en UTC ya sea mañana", () => {
  assert.equal(todayIso(new Date("2026-10-07T03:30:00.000Z")), "2026-10-06");
  assert.equal(new Date("2026-10-07T03:30:00.000Z").toISOString().split("T")[0], "2026-10-07"); // lo que se hacía antes
});
