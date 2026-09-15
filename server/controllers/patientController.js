const { isObjectIdOrHexString } = require("mongoose");
const Patient = require("../models/Patient");
const { randomUUID } = require("crypto");
const { list, create } = require("../data/memoryStore");
const { readPagination, paginatedResponse } = require("../utils/pagination");
const { emitDashboardUpdate } = require("../realtime/dashboardSocket");

const createPatientId = () =>
  `OPD-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;

exports.getPatients = async (req, res, next) => {
  try {
    const { page, limit, skip } = readPagination(req.query);
    const search = req.query.search?.trim();
    const filter = req.query.patientId
      ? {
          $or: [
            { patientId: req.query.patientId },
            ...(isObjectIdOrHexString(req.query.patientId)
              ? [{ _id: req.query.patientId }]
              : []),
          ],
        }
      : search
        ? {
            $or: ["name", "patientId", "phone"].map((field) => ({
              [field]: { $regex: search, $options: "i" },
            })),
          }
        : {};
    if (Patient.db.readyState === 1) {
      const [items, totalItems] = await Promise.all([
        Patient.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Patient.countDocuments(filter),
      ]);
      return paginatedResponse(res, { items, totalItems, page, limit });
    }
    const patients = await list(Patient, "patients");
    const term = search?.toLowerCase();
    const matches = req.query.patientId
      ? patients.filter(
          (patient) =>
            patient.patientId === req.query.patientId ||
            String(patient._id) === req.query.patientId,
        )
      : term
        ? patients.filter((patient) =>
            [patient.name, patient.patientId, patient.phone].some((value) =>
              value?.toLowerCase().includes(term),
            ),
          )
        : patients;
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
exports.createPatient = async (req, res, next) => {
  try {
    const patient = await create(Patient, "patients", {
      ...req.body,
      patientId: createPatientId(),
    });
    emitDashboardUpdate();
    res.status(201).json(patient);
  } catch (error) {
    next(error);
  }
};
