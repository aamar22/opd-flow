const Appointment = require("../models/Appointment");
const Visit = require("../models/Visit");
const AppError = require("../utils/AppError");
const { list, create, update, getMaster } = require("../data/memoryStore");
const ClinicSettings = require("../models/ClinicSettings");
const { readPagination, paginatedResponse } = require("../utils/pagination");
const { emitDashboardUpdate } = require("../realtime/dashboardSocket");

exports.getAppointments = async (req, res, next) => {
  try {
    const { page, limit, skip } = readPagination(req.query);
    const search = req.query.search?.trim();
    const filter = search
      ? {
          $or: ["patientName", "patientId", "doctor", "department"].map(
            (field) => ({ [field]: { $regex: search, $options: "i" } }),
          ),
        }
      : {};
    if (Appointment.db.readyState === 1) {
      const [items, totalItems] = await Promise.all([
        Appointment.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Appointment.countDocuments(filter),
      ]);
      return paginatedResponse(res, { items, totalItems, page, limit });
    }
    const appointments = await list(Appointment, "appointments");
    const term = search?.toLowerCase();
    const matches = appointments.filter(
      (appointment) =>
        !term ||
        [
          appointment.patientName,
          appointment.patientId,
          appointment.doctor,
          appointment.department,
        ].some((value) => value?.toLowerCase().includes(term)),
    );
    matches.sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    );
    paginatedResponse(res, {
      items: matches.slice(skip, skip + limit),
      totalItems: matches.length,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
};

exports.createAppointment = async (req, res, next) => {
  try {
    const settings = await getMaster(ClinicSettings, "clinicSettings");
    const doctor = settings.doctors.find(
      (item) => item.name === req.body.doctor,
    );
    if (!doctor)
      throw new AppError(
        "Select a doctor configured by the administrator",
        400,
      );
    const day = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "UTC",
    }).format(new Date(`${req.body.appointmentDate}T00:00:00Z`));
    const availability = doctor.availability.find((item) => item.day === day);
    if (
      !availability ||
      req.body.appointmentTime < availability.start ||
      req.body.appointmentTime >= availability.end
    )
      throw new AppError(
        "The selected doctor is not available at this time",
        400,
      );
    const conflictFilter = {
      doctor: req.body.doctor,
      appointmentDate: req.body.appointmentDate,
      appointmentTime: req.body.appointmentTime,
      status: { $ne: "Cancelled" },
    };
    const hasConflict =
      Appointment.db.readyState === 1
        ? await Appointment.exists(conflictFilter)
        : (await list(Appointment, "appointments")).some(
            (item) =>
              item.doctor === req.body.doctor &&
              item.appointmentDate === req.body.appointmentDate &&
              item.appointmentTime === req.body.appointmentTime &&
              item.status !== "Cancelled",
          );
    if (hasConflict)
      throw new AppError("This appointment time has already been booked", 409);
    req.body.department = doctor.department;
    const [appointment] = await Promise.all([
      create(Appointment, "appointments", { status: "Scheduled", ...req.body }),
      create(Visit, "visits", {
        status: "Waiting",
        patientId: req.body.patientId,
        patientName: req.body.patientName,
        doctor: req.body.doctor,
        department: req.body.department,
        symptoms: req.body.reason,
      }),
    ]);
    emitDashboardUpdate();
    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
};

exports.updateAppointment = async (req, res, next) => {
  try {
    const appointment = await update(
      Appointment,
      "appointments",
      req.params.id,
      req.body,
    );
    if (!appointment) throw new AppError("Appointment not found", 404);
    emitDashboardUpdate();
    res.json(appointment);
  } catch (error) {
    next(error);
  }
};
