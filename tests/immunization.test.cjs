const test = require("node:test");
const assert = require("node:assert/strict");
const Visit = require("../server/models/Visit");
const base = { patientId: "p1", patientName: "Child", doctor: "Doctor", department: "OPD", symptoms: "Review" };
test("immunizations persist all fields without completing consultation", () => {
  const entry = { vaccine: "Recorded vaccine", dose: "1", dateGiven: "2026-09-01", nextDueDate: "2026-10-01", batchNumber: "B123", provider: "Clinic", notes: "Imported vaccination card" };
  const visit = new Visit({ ...base, immunizations: [entry] });
  assert.equal(visit.validateSync(), undefined);
  const restored = new Visit(visit.toObject());
  for (const [key, value] of Object.entries(entry)) assert.equal(restored.immunizations[0][key], value);
  assert.equal(restored.status, "Waiting");
});
test("old visits remain valid and incomplete vaccination entries are rejected", () => {
  assert.equal(new Visit(base).validateSync(), undefined);
  const error = new Visit({ ...base, immunizations: [{}] }).validateSync();
  for (const field of ["vaccine", "dose", "dateGiven"]) assert.ok(error.errors[`immunizations.0.${field}`]);
});