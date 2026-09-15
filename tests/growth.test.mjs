import { matchesPatient } from "../src/utils/growth.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  isGrowthEligible,
  growthPoints,
  ageInMonths,
} from "../src/utils/growth.mjs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Visit = require("../server/models/Visit.js");
test("growth access includes newborns and six-year-olds, excludes seven and unknown ages", () => {
  for (const age of [0, 1, 6, 6.9])
    assert.equal(isGrowthEligible({ age }), true);
  for (const age of [7, 20, -1, null, undefined, "", "bad"])
    assert.equal(isGrowthEligible({ age }), false);
});
test("birth date gate changes on seventh birthday", () => {
  const patient = { dateOfBirth: "2019-09-07", age: 6 };
  assert.equal(
    isGrowthEligible(patient, new Date("2026-09-06T12:00:00")),
    true,
  );
  assert.equal(
    isGrowthEligible(patient, new Date("2026-09-07T12:00:00")),
    false,
  );
  assert.equal(isGrowthEligible({ dateOfBirth: "invalid", age: 2 }), false);
  assert.equal(ageInMonths("2026-09-08", new Date("2026-09-07")), null);
});
const visit = { _id: "v1", patientId: "p1", createdAt: "2026-09-07" };
test("BMI uses paired measurements and retains a zero Z-score", () => {
  const [point] = growthPoints(
    visit,
    [
      {
        growthAgeMonths: "24",
        weight: "16",
        height: "100",
        growthZScore: "0",
        growthReference: "Verified WHO report",
      },
    ],
    [],
    {},
  );
  assert.equal(point.bmi, 16);
  assert.equal(point.z, 0);
  assert.equal(point.head, null);
});
test("unknown age is not inferred from registration age; invalid and older readings are excluded", () => {
  const rows = [
    { weight: "10" },
    { weight: "10", growthAgeMonths: "84" },
    { weight: "10", growthAgeMonths: "-1" },
  ];
  assert.deepEqual(growthPoints(visit, rows, [], { age: 2 }), []);
});
test("history cannot mix patients or duplicate the active visit", () => {
  const other = {
    ...visit,
    _id: undefined,
    _id: "v2",
    patientId: "p2",
    vitals: { weight: "9", growthAgeMonths: "12" },
  };
  assert.equal(
    growthPoints(
      visit,
      [{ weight: "16", growthAgeMonths: "24" }],
      [other, visit],
      {},
    ).length,
    1,
  );
});
test("Mongo schema preserves pediatric measurements and Z-score provenance", () => {
  const reading = {
    weight: "16",
    height: "100",
    headCircumference: "48",
    growthAgeMonths: "24",
    growthZScore: "0",
    growthReference: "WHO report",
    growthMetric: "weight",
  };
  const saved = new Visit({
    ...visit,
    _id: undefined,
    patientName: "Child",
    doctor: "Doctor",
    department: "OPD",
    symptoms: "Review",
    vitals: reading,
    vitalHistory: [reading],
  });
  assert.equal(saved.validateSync(), undefined);
  for (const [key, value] of Object.entries(reading)) {
    assert.equal(saved.vitals[key], value);
    assert.equal(saved.vitalHistory[0][key], value);
  }
});

test("appointment database IDs and OPD IDs both resolve to the same five-year-old patient", () => {
  const ravi = {
    _id: "507f1f77bcf86cd799439011",
    patientId: "OPD-RAVI",
    age: 5,
  };
  assert.equal(matchesPatient(ravi, ravi._id) && isGrowthEligible(ravi), true);
  assert.equal(
    matchesPatient(ravi, ravi.patientId) && isGrowthEligible(ravi),
    true,
  );
  assert.equal(matchesPatient(ravi, "unrelated"), false);
  assert.equal(matchesPatient({}, undefined), false);
});
