const Visit = require("../models/Visit");
const AppError = require("../utils/AppError");
const { list, create, update } = require("../data/memoryStore");
const { readPagination, paginatedResponse } = require("../utils/pagination");
const { emitDashboardUpdate } = require("../realtime/dashboardSocket");
exports.getVisits = async (req, res, next) => {
  try {
    const { page, limit, skip } = readPagination(req.query);
    const search = req.query.search?.trim();
    const filter = {
      ...(req.query.status ? { status: req.query.status } : {}),
      ...(req.query.patientId ? { patientId: req.query.patientId } : {}),
      ...(search
        ? {
            $or: [
              "patientName",
              "patientId",
              "doctor",
              "department",
              "symptoms",
            ].map((field) => ({ [field]: { $regex: search, $options: "i" } })),
          }
        : {}),
    };
    if (Visit.db.readyState === 1) {
      const [items, totalItems] = await Promise.all([
        Visit.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Visit.countDocuments(filter),
      ]);
      return paginatedResponse(res, { items, totalItems, page, limit });
    }
    const visits = await list(Visit, "visits");
    const term = search?.toLowerCase();
    const matches = visits.filter(
      (visit) =>
        (!req.query.status || visit.status === req.query.status) &&
        (!req.query.patientId || visit.patientId === req.query.patientId) &&
        (!term ||
          [
            visit.patientName,
            visit.patientId,
            visit.doctor,
            visit.department,
            visit.symptoms,
          ].some((value) => value?.toLowerCase().includes(term))),
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
exports.createVisit = async (req, res, next) => {
  try {
    const visit = await create(Visit, "visits", { status: "Waiting", ...req.body });
    emitDashboardUpdate();
    res.status(201).json(visit);
  } catch (error) {
    next(error);
  }
};
exports.updateVisit = async (req, res, next) => {
  try {
    const visit = await update(Visit, "visits", req.params.id, req.body);
    if (!visit) throw new AppError("Visit not found", 404);
    emitDashboardUpdate();
    res.json(visit);
  } catch (error) {
    next(error);
  }
};
