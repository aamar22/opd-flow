const Patient = require("../models/Patient");
const Visit = require("../models/Visit");
const Medicine = require("../models/Medicine");
const Invoice = require("../models/Invoice");
const Ward = require("../models/Ward");
const mongoose = require("mongoose");
const { list } = require("../data/memoryStore");
const getDashboardStats = async () => {
  if (mongoose.connection.readyState === 1) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
    const [
      patients,
      today,
      waiting,
      lowStock,
      medicines,
      prescriptions,
      wards,
    ] = await Promise.all([
      Patient.countDocuments(),
      Visit.countDocuments({
        createdAt: { $gte: startOfToday, $lt: startOfTomorrow },
      }),
      Visit.countDocuments({ status: "Waiting" }),
      Medicine.countDocuments({ $expr: { $lte: ["$stock", "$reorder"] } }),
      Medicine.countDocuments(),
      Visit.countDocuments({
        status: "Completed",
        "medicines.0": { $exists: true },
      }),
      Ward.find({}, { beds: 1 }),
    ]);
    const beds = wards.flatMap((ward) => ward.beds || []);
    return {
      patients,
      today,
      waiting,
      lowStock,
      medicines,
      prescriptions,
      totalBeds: beds.length,
      availableBeds: beds.filter((bed) => bed.status === "Available").length,
      occupiedBeds: beds.filter((bed) => bed.status === "Occupied").length,
      maintenanceBeds: beds.filter((bed) => bed.status === "Maintenance")
        .length,
    };
  }
  const [patients, visits, medicines, wards] = await Promise.all([
    list(Patient, "patients"),
    list(Visit, "visits"),
    list(Medicine, "medicines"),
    list(Ward, "wards"),
  ]);
  const beds = wards.flatMap((ward) => ward.beds || []);
  const today = new Date().toDateString();
  return {
    patients: patients.length,
    today: visits.filter(
      (visit) => new Date(visit.createdAt).toDateString() === today,
    ).length,
    waiting: visits.filter((visit) => visit.status === "Waiting").length,
    lowStock: medicines.filter((medicine) => medicine.stock <= medicine.reorder)
      .length,
    medicines: medicines.length,
    prescriptions: visits.filter(
      (visit) => visit.status === "Completed" && visit.medicines?.length,
    ).length,
    totalBeds: beds.length,
    availableBeds: beds.filter((bed) => bed.status === "Available").length,
    occupiedBeds: beds.filter((bed) => bed.status === "Occupied").length,
    maintenanceBeds: beds.filter((bed) => bed.status === "Maintenance").length,
  };
};

exports.getDashboardStats = getDashboardStats;
exports.getDashboard = async (_req, res, next) => {
  try {
    res.json(await getDashboardStats());
  } catch (error) {
    next(error);
  }
};

exports.getRevenue = async (req, res, next) => {
  try {
    const period = ["day", "week", "month", "year"].includes(req.query.period)
      ? req.query.period
      : "month";
    const now = new Date();
    const start = new Date(now);
    const buckets = [];
    const addBucket = (label, bucketStart, bucketEnd) =>
      buckets.push({
        label,
        start: bucketStart,
        end: bucketEnd,
        opd: 0,
        pharmacy: 0,
        ipd: 0,
      });
    if (period === "day") {
      start.setHours(0, 0, 0, 0);
      for (let hour = 0; hour < 24; hour += 3) {
        const bucketStart = new Date(start);
        bucketStart.setHours(hour);
        const bucketEnd = new Date(bucketStart);
        bucketEnd.setHours(hour + 3);
        addBucket(
          `${String(hour).padStart(2, "0")}:00`,
          bucketStart,
          bucketEnd,
        );
      }
    } else if (period === "week") {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      for (let day = 0; day < 7; day += 1) {
        const bucketStart = new Date(start);
        bucketStart.setDate(start.getDate() + day);
        const bucketEnd = new Date(bucketStart);
        bucketEnd.setDate(bucketEnd.getDate() + 1);
        addBucket(
          bucketStart.toLocaleDateString("en-US", { weekday: "short" }),
          bucketStart,
          bucketEnd,
        );
      }
    } else if (period === "month") {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const lastDay = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
      ).getDate();
      for (let day = 1; day <= lastDay; day += 1) {
        const bucketStart = new Date(start);
        bucketStart.setDate(day);
        const bucketEnd = new Date(bucketStart);
        bucketEnd.setDate(day + 1);
        addBucket(String(day), bucketStart, bucketEnd);
      }
    } else {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      for (let month = 0; month < 12; month += 1) {
        const bucketStart = new Date(now.getFullYear(), month, 1);
        const bucketEnd = new Date(now.getFullYear(), month + 1, 1);
        addBucket(
          bucketStart.toLocaleDateString("en-US", { month: "short" }),
          bucketStart,
          bucketEnd,
        );
      }
    }
    const invoices = await list(Invoice, "invoices");
    invoices.forEach((invoice) => {
      const createdAt = new Date(invoice.createdAt);
      const bucket = buckets.find(
        (item) => createdAt >= item.start && createdAt < item.end,
      );
      if (bucket) {
        const type =
          invoice.invoiceType === "Pharmacy"
            ? "pharmacy"
            : invoice.invoiceType === "IPD"
              ? "ipd"
              : "opd";
        const revenueAmount =
          type === "ipd"
            ? Number(invoice.balanceBeforeAdvance) || Number(invoice.total) || 0
            : Number(invoice.total) || 0;
        bucket[type] += revenueAmount;
      }
    });
    const periodInvoices = invoices.filter(
      (invoice) => new Date(invoice.createdAt) >= start,
    );
    const opdTotal = buckets.reduce((sum, item) => sum + item.opd, 0);
    const pharmacyTotal = buckets.reduce((sum, item) => sum + item.pharmacy, 0);
    const ipdTotal = buckets.reduce((sum, item) => sum + item.ipd, 0);
    res.json({
      period,
      total: opdTotal + pharmacyTotal + ipdTotal,
      opdTotal,
      pharmacyTotal,
      ipdTotal,
      invoiceCount: periodInvoices.length,
      opdInvoiceCount: periodInvoices.filter(
        (invoice) => invoice.invoiceType === "Service",
      ).length,
      pharmacyInvoiceCount: periodInvoices.filter(
        (invoice) => invoice.invoiceType === "Pharmacy",
      ).length,
      ipdInvoiceCount: periodInvoices.filter(
        (invoice) => invoice.invoiceType === "IPD",
      ).length,
      buckets: buckets.map(({ label, opd, pharmacy, ipd }) => ({
        label,
        opd,
        pharmacy,
        ipd,
      })),
    });
  } catch (error) {
    next(error);
  }
};
