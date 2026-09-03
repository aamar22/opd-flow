const mongoose = require("mongoose");
const memoryStore = {
  patients: [],
  visits: [],
  appointments: [],
  services: [
    {
      _id: "s1",
      code: "CONS-GEN",
      name: "General Consultation",
      category: "Consultation",
      rate: 300,
      active: true,
    },
    {
      _id: "s2",
      code: "CONS-FUP",
      name: "Follow-up Consultation",
      category: "Consultation",
      rate: 150,
      active: true,
    },
  ],
  invoices: [],
  wards: [],
  admissions: [],
  ipdBillingRules: {
    calculationMethod: "Prorated",
    graceMinutes: 15,
    minimumHours: 1,
  },
  clinicSettings: {
    clinicName: "ClinicFlow",
    logoUrl: "",
    address: "",
    phone: "",
    email: "",
    doctors: [
      {
        id: "doctor-1",
        name: "Dr. Ananya Sharma",
        department: "General Medicine",
        availability: [
          { day: "Monday", start: "09:00", end: "17:00" },
          { day: "Tuesday", start: "09:00", end: "17:00" },
          { day: "Wednesday", start: "09:00", end: "17:00" },
          { day: "Thursday", start: "09:00", end: "17:00" },
          { day: "Friday", start: "09:00", end: "17:00" },
        ],
      },
      {
        id: "doctor-2",
        name: "Dr. Rahul Mehta",
        department: "Orthopaedics",
        availability: [
          { day: "Monday", start: "10:00", end: "18:00" },
          { day: "Wednesday", start: "10:00", end: "18:00" },
          { day: "Friday", start: "10:00", end: "18:00" },
        ],
      },
    ],
  },
  medicines: [
    {
      _id: "m1",
      name: "Paracetamol 500mg",
      batchNumber: "PCM-2401",
      vendorName: "Demo Pharma Distributors",
      orderDate: "2026-08-15",
      expiryDate: "2027-12-31",
      stock: 180,
      unit: "Tablets",
      price: 1.5,
      reorder: 50,
    },
    {
      _id: "m2",
      name: "Amoxicillin 250mg",
      batchNumber: "AMX-2402",
      vendorName: "Demo Pharma Distributors",
      orderDate: "2026-08-15",
      expiryDate: "2027-08-31",
      stock: 34,
      unit: "Capsules",
      price: 8,
      reorder: 40,
    },
    {
      _id: "m3",
      name: "ORS Sachet",
      batchNumber: "ORS-2403",
      vendorName: "Health Supply Co.",
      orderDate: "2026-08-20",
      expiryDate: "2028-01-31",
      stock: 75,
      unit: "Sachets",
      price: 18,
      reorder: 30,
    },
  ],
};
const ready = () => mongoose.connection.readyState === 1;
const id = (prefix) =>
  `${prefix}${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
const list = async (Model, key) =>
  ready() ? Model.find().sort({ createdAt: -1 }) : memoryStore[key];
const create = async (Model, key, data) => {
  if (ready()) return Model.create(data);
  const item = { _id: id(key[0]), ...data, createdAt: new Date() };
  memoryStore[key].unshift(item);
  return item;
};
const update = async (Model, key, itemId, data) => {
  if (ready())
    return Model.findByIdAndUpdate(itemId, data, {
      new: true,
      runValidators: true,
    });
  const item = memoryStore[key].find((entry) => entry._id === itemId);
  if (item) Object.assign(item, data);
  return item;
};
const getMaster = async (Model, key) =>
  ready() ? Model.findOne() : memoryStore[key];
const saveMaster = async (Model, key, data) => {
  if (ready())
    return Model.findOneAndUpdate({}, data, {
      new: true,
      upsert: true,
      runValidators: true,
    });
  memoryStore[key] = { ...memoryStore[key], ...data };
  return memoryStore[key];
};
module.exports = { list, create, update, getMaster, saveMaster };
