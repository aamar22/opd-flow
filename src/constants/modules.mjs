export const MODULES = [
  {
    key: "opd",
    name: "OPD",
    pages: [
      "Patient Registration",
      "Appointments",
      "Patient Billing",
      "OPD Visits",
      "Consultation Queue",
    ],
  },
  {
    key: "ipd",
    name: "IPD",
    pages: [
      "IPD Admissions",
      "IPD Billing",
      "Ward & Bed Masters",
      "Bed Tariff/Billing Rules",
    ],
  },
  {
    key: "pharmacy",
    name: "Pharmacy",
    pages: ["Pharmacy Inventory", "Dispense Medicines", "Pharmacy Billing"],
  },
];
export const DEFAULT_MODULES = { opd: true, ipd: true, pharmacy: true };
export function isPageEnabled(page, modules = {}) {
  const module = MODULES.find((item) => item.pages.includes(page));
  return !module || modules[module.key] !== false;
}
