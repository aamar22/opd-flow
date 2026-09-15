export function matchesPatient(patient, reference) {
  if (
    !patient ||
    reference === null ||
    reference === undefined ||
    String(reference).trim() === ""
  )
    return false;
  return [patient._id, patient.patientId].some(
    (id) => id !== null && id !== undefined && String(id) === String(reference),
  );
}
export function numberOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === "")
    return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
export function ageInMonths(dateOfBirth, date = new Date()) {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const end = new Date(date);
  if (
    !Number.isFinite(birth.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end < birth
  )
    return null;
  let months =
    (end.getFullYear() - birth.getFullYear()) * 12 +
    end.getMonth() -
    birth.getMonth();
  if (end.getDate() < birth.getDate()) months -= 1;
  return months;
}
export function isGrowthEligible(patient, now = new Date()) {
  if (!patient) return false;
  const months = ageInMonths(patient.dateOfBirth, now);
  if (patient.dateOfBirth) return months !== null && months < 84;
  const age = numberOrNull(patient.age);
  return age !== null && age >= 0 && age < 7;
}
export function growthPoints(visit, readings, history, patient) {
  return [
    ...history.filter(
      (item) => item.patientId === visit.patientId && item._id !== visit._id,
    ),
    { ...visit, vitalHistory: readings },
  ]
    .flatMap((item) =>
      (item.vitalHistory?.length
        ? item.vitalHistory
        : [{ ...item.vitals, recordedAt: item.createdAt }]
      ).map((reading) => {
        const date = new Date(reading.recordedAt || item.createdAt);
        const explicitAge = numberOrNull(reading.growthAgeMonths);
        const age = explicitAge ?? ageInMonths(patient.dateOfBirth, date);
        const weight = numberOrNull(reading.weight);
        const height = numberOrNull(reading.height);
        return {
          date,
          age,
          weight,
          height,
          head: numberOrNull(reading.headCircumference),
          bmi: weight > 0 && height > 0 ? weight / (height / 100) ** 2 : null,
          z: numberOrNull(reading.growthZScore),
          source: reading.growthReference?.trim(),
          metric: reading.growthMetric || "weight",
        };
      }),
    )
    .filter(
      (point) =>
        Number.isFinite(point.date.getTime()) &&
        point.age !== null &&
        point.age >= 0 &&
        point.age < 84,
    )
    .sort((a, b) => a.date - b.date);
}
