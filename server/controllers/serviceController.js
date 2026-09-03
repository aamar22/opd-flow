const Service = require("../models/Service");
const AppError = require("../utils/AppError");
const { list, create, update } = require("../data/memoryStore");
exports.getServices = async (req, res, next) => {
  try {
    const services = await list(Service, "services");
    res.json(
      req.query.active === "true"
        ? services.filter((item) => item.active)
        : services,
    );
  } catch (error) {
    next(error);
  }
};
exports.createService = async (req, res, next) => {
  try {
    res.status(201).json(await create(Service, "services", req.body));
  } catch (error) {
    next(error);
  }
};
exports.updateService = async (req, res, next) => {
  try {
    const service = await update(Service, "services", req.params.id, req.body);
    if (!service) throw new AppError("Service not found", 404);
    res.json(service);
  } catch (error) {
    next(error);
  }
};
