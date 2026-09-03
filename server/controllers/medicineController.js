const Medicine = require("../models/Medicine");
const AppError = require("../utils/AppError");
const { list, create, update } = require("../data/memoryStore");
const { emitDashboardUpdate } = require("../realtime/dashboardSocket");
exports.getMedicines = async (_req, res, next) => {
  try {
    const medicines = await list(Medicine, "medicines");
    res.json(medicines);
  } catch (error) {
    next(error);
  }
};
exports.createMedicine = async (req, res, next) => {
  try {
    const expiryDate = new Date(req.body.expiryDate);
    if (Number.isNaN(expiryDate.getTime()))
      throw new AppError("A valid expiry date is required", 400);
    const medicine = await create(Medicine, "medicines", {
      ...req.body,
      stock: Number(req.body.stock),
      price: Number(req.body.price),
      reorder: Number(req.body.reorder),
    });
    emitDashboardUpdate();
    res.status(201).json(medicine);
  } catch (error) {
    next(error);
  }
};

exports.dispenseMedicines = async (req, res, next) => {
  try {
    const lines = (req.body.items || []).map((item) => ({
      name: String(item.name || "").trim(),
      quantity: Number(item.quantity),
    }));
    if (!lines.length || lines.some((item) => !item.name || item.quantity <= 0))
      throw new AppError("Valid medicine quantities are required", 400);
    const totals = new Map();
    lines.forEach((item) => {
      const key = item.name.toLowerCase();
      const current = totals.get(key);
      totals.set(key, {
        name: current?.name || item.name,
        quantity: (current?.quantity || 0) + item.quantity,
      });
    });
    const requested = [...totals.values()];

    const all = await list(Medicine, "medicines");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const changes = [];
    for (const request of requested) {
      let remaining = request.quantity;
      const batches = all
        .filter(
          (batch) =>
            batch.name.toLowerCase() === request.name.toLowerCase() &&
            Number(batch.stock) > 0 &&
            (!batch.expiryDate || new Date(batch.expiryDate) >= today),
        )
        .sort(
          (a, b) =>
            new Date(a.expiryDate || "9999-12-31") -
            new Date(b.expiryDate || "9999-12-31"),
        );
      for (const batch of batches) {
        const quantity = Math.min(remaining, Number(batch.stock));
        if (quantity > 0)
          changes.push({ batch, stock: Number(batch.stock) - quantity });
        remaining -= quantity;
        if (!remaining) break;
      }
      if (remaining > 0)
        throw new AppError(
          `Insufficient non-expired stock for ${request.name}`,
          409,
        );
    }
    await Promise.all(
      changes.map(({ batch, stock }) =>
        update(Medicine, "medicines", batch._id, { stock }),
      ),
    );
    emitDashboardUpdate();
    res.json({ dispensed: requested, batchesUpdated: changes.length });
  } catch (error) {
    next(error);
  }
};
exports.updateMedicine = async (req, res, next) => {
  try {
    const medicine = await update(
      Medicine,
      "medicines",
      req.params.id,
      req.body,
    );
    if (!medicine) throw new AppError("Medicine not found", 404);
    emitDashboardUpdate();
    res.json(medicine);
  } catch (error) {
    next(error);
  }
};
