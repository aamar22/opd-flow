const ClinicSettings = require("../models/ClinicSettings");
const Appointment = require("../models/Appointment");
const AppError = require("../utils/AppError");
const { getMaster, saveMaster, list } = require("../data/memoryStore");

const defaultSettings = {
  clinicName: "ClinicFlow",
  logoUrl: "",
  address: "",
  phone: "",
  email: "",
  modules: { opd: true, ipd: true, pharmacy: true },
  doctors: [
    {
      id: "doctor-1",
      name: "Dr. Ananya Sharma",
      department: "General Medicine",
      availability: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
      ].map((day) => ({ day, start: "09:00", end: "17:00" })),
    },
    {
      id: "doctor-2",
      name: "Dr. Rahul Mehta",
      department: "Orthopaedics",
      availability: ["Monday", "Wednesday", "Friday"].map((day) => ({
        day,
        start: "10:00",
        end: "18:00",
      })),
    },
  ],
};
const dayFor = (date) =>
  new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
const toMinutes = (value) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

exports.getSettings = async (_req, res, next) => {
  try {
    let settings = await getMaster(ClinicSettings, "clinicSettings");
    if (!settings)
      settings = await saveMaster(
        ClinicSettings,
        "clinicSettings",
        defaultSettings,
      );
    res.json(settings);
  } catch (error) {
    next(error);
  }
};
exports.updateSettings = async (req, res, next) => {
  try {
    const { modules: ignoredModules, ...settingsFields } = req.body;
    const doctors = Array.isArray(req.body.doctors)
      ? req.body.doctors.map((doctor, index) => ({
          ...doctor,
          id: doctor.id || `doctor-${Date.now()}-${index}`,
        }))
      : undefined;
    res.json(
      await saveMaster(ClinicSettings, "clinicSettings", {
        ...settingsFields,
        ...(doctors ? { doctors } : {}),
      }),
    );
  } catch (error) {
    next(error);
  }
};
exports.updateModules = async (req, res, next) => {
  try {
    const modules = req.body.modules;
    const keys = ["opd", "ipd", "pharmacy"];
    if (
      !modules ||
      keys.some((key) => typeof modules[key] !== "boolean") ||
      Object.keys(modules).some((key) => !keys.includes(key))
    ) {
      throw new AppError("Provide boolean OPD, IPD and pharmacy settings", 400);
    }
    const existing = await getMaster(ClinicSettings, "clinicSettings");
    res.json(
      await saveMaster(ClinicSettings, "clinicSettings", {
        ...(!existing ? defaultSettings : {}),
        modules,
      }),
    );
  } catch (error) {
    next(error);
  }
};
exports.getAvailability = async (req, res, next) => {
  try {
    const { doctor: doctorName, date } = req.query;
    if (!doctorName || !date)
      throw new AppError("Doctor and date are required", 400);
    const settings = await getMaster(ClinicSettings, "clinicSettings");
    const doctor = settings.doctors.find((item) => item.name === doctorName);
    if (!doctor) throw new AppError("Doctor not found", 404);
    const window = doctor.availability.find(
      (item) => item.day === dayFor(date),
    );
    const appointments = await list(Appointment, "appointments");
    const booked = appointments
      .filter(
        (item) =>
          item.doctor === doctorName &&
          item.appointmentDate === date &&
          item.status !== "Cancelled",
      )
      .map((item) => item.appointmentTime);
    if (!window) return res.json({ doctor, slots: [] });
    const slots = [];
    for (
      let time = toMinutes(window.start);
      time + 15 <= toMinutes(window.end);
      time += 15
    ) {
      const value = `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;
      if (!booked.includes(value)) slots.push(value);
    }
    res.json({ doctor, slots });
  } catch (error) {
    next(error);
  }
};
