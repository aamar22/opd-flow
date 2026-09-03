const { randomUUID } = require("crypto");
const mongoose = require("mongoose");
const Ward = require("../models/Ward");
const Admission = require("../models/Admission");
const Patient = require("../models/Patient");
const Invoice = require("../models/Invoice");
const IpdBillingRules = require("../models/IpdBillingRules");
const AppError = require("../utils/AppError");
const {
  list,
  create,
  update,
  getMaster,
  saveMaster,
} = require("../data/memoryStore");
const { emitDashboardUpdate } = require("../realtime/dashboardSocket");

const connected = () => mongoose.connection.readyState === 1;
const code = () =>
  `IPD-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
const bedId = () => `bed-${randomUUID().slice(0, 8)}`;
const defaultBillingRules = {
  calculationMethod: "Prorated",
  graceMinutes: 15,
  minimumHours: 1,
};

exports.getBillingRules = async (_req, res, next) => {
  try {
    res.json(
      (await getMaster(IpdBillingRules, "ipdBillingRules")) ||
        defaultBillingRules,
    );
  } catch (error) {
    next(error);
  }
};

exports.updateBillingRules = async (req, res, next) => {
  try {
    if (
      !["Prorated", "HighestPerDay", "MinimumGrace"].includes(
        req.body.calculationMethod,
      )
    )
      throw new AppError("Invalid bed billing calculation method", 400);
    const rules = await saveMaster(IpdBillingRules, "ipdBillingRules", {
      calculationMethod: req.body.calculationMethod,
      graceMinutes: Math.max(0, Number(req.body.graceMinutes) || 0),
      minimumHours: Math.max(0, Number(req.body.minimumHours) || 0),
    });
    res.json(rules);
  } catch (error) {
    next(error);
  }
};

exports.getWards = async (_req, res, next) => {
  try {
    res.json(await list(Ward, "wards"));
  } catch (error) {
    next(error);
  }
};

exports.createWard = async (req, res, next) => {
  try {
    const ward = await create(Ward, "wards", {
      name: req.body.name,
      floor: req.body.floor,
      wardType: req.body.wardType,
      beds: [],
    });
    await emitDashboardUpdate();
    res.status(201).json(ward);
  } catch (error) {
    next(error);
  }
};

exports.updateWard = async (req, res, next) => {
  try {
    const payload = {
      name: req.body.name,
      floor: req.body.floor,
      wardType: req.body.wardType,
    };
    const ward = connected()
      ? await Ward.findByIdAndUpdate(req.params.id, payload, {
          new: true,
          runValidators: true,
        })
      : await update(Ward, "wards", req.params.id, payload);
    if (!ward) throw new AppError("Ward not found", 404);
    res.json(ward);
  } catch (error) {
    next(error);
  }
};

exports.deleteWard = async (req, res, next) => {
  try {
    const wards = await list(Ward, "wards");
    const ward = wards.find(
      (item) => String(item._id) === String(req.params.id),
    );
    if (!ward) throw new AppError("Ward not found", 404);
    if (ward.beds.some((bed) => bed.status === "Occupied"))
      throw new AppError("Cannot delete a ward containing occupied beds", 409);
    if (connected()) await Ward.findByIdAndDelete(req.params.id);
    else wards.splice(wards.indexOf(ward), 1);
    await emitDashboardUpdate();
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

exports.addBed = async (req, res, next) => {
  try {
    const bed = {
      _id: bedId(),
      bedNumber: req.body.bedNumber,
      bedType: req.body.bedType || "Standard",
      dailyRate: Number(req.body.dailyRate) || 0,
      status: "Available",
      patientId: null,
    };
    let ward;
    if (connected()) {
      ward = await Ward.findOneAndUpdate(
        { _id: req.params.id, "beds.bedNumber": { $ne: bed.bedNumber } },
        { $push: { beds: { ...bed, _id: undefined } } },
        { new: true, runValidators: true },
      );
    } else {
      ward = (await list(Ward, "wards")).find(
        (item) => item._id === req.params.id,
      );
      if (ward && !ward.beds.some((item) => item.bedNumber === bed.bedNumber))
        ward.beds.push(bed);
      else ward = null;
    }
    if (!ward)
      throw new AppError("Ward not found or bed number already exists", 409);
    await emitDashboardUpdate();
    res.status(201).json(ward);
  } catch (error) {
    next(error);
  }
};

exports.updateBed = async (req, res, next) => {
  try {
    const wards = await list(Ward, "wards");
    const currentWard = wards.find(
      (item) => String(item._id) === String(req.params.id),
    );
    const currentBed = currentWard?.beds.find(
      (item) => String(item._id) === String(req.params.bedId),
    );
    if (!currentBed) throw new AppError("Bed not found", 404);
    if (
      currentWard.beds.some(
        (item) =>
          String(item._id) !== String(req.params.bedId) &&
          item.bedNumber === req.body.bedNumber,
      )
    )
      throw new AppError("Bed number already exists in this ward", 409);
    const payload = {
      bedNumber: req.body.bedNumber,
      bedType: req.body.bedType,
      dailyRate: Number(req.body.dailyRate) || 0,
    };
    let ward;
    if (connected()) {
      ward = await Ward.findOneAndUpdate(
        { _id: req.params.id, "beds._id": req.params.bedId },
        {
          $set: {
            "beds.$.bedNumber": payload.bedNumber,
            "beds.$.bedType": payload.bedType,
            "beds.$.dailyRate": payload.dailyRate,
          },
        },
        { new: true, runValidators: true },
      );
    } else {
      Object.assign(currentBed, payload);
      ward = currentWard;
    }
    res.json(ward);
  } catch (error) {
    next(error);
  }
};

exports.updateBedStatus = async (req, res, next) => {
  try {
    if (!["Available", "Maintenance"].includes(req.body.status))
      throw new AppError("Bed status must be Available or Maintenance", 400);
    const wards = await list(Ward, "wards");
    const ward = wards.find(
      (item) => String(item._id) === String(req.params.id),
    );
    const bed = ward?.beds.find(
      (item) => String(item._id) === String(req.params.bedId),
    );
    if (!bed) throw new AppError("Bed not found", 404);
    if (bed.status === "Occupied")
      throw new AppError("An occupied bed cannot be marked under repair", 409);
    if (connected()) {
      await Ward.updateOne(
        { _id: req.params.id, "beds._id": req.params.bedId },
        { $set: { "beds.$.status": req.body.status } },
      );
    } else bed.status = req.body.status;
    await emitDashboardUpdate();
    res.json({ ...(bed.toObject?.() || bed), status: req.body.status });
  } catch (error) {
    next(error);
  }
};

exports.deleteBed = async (req, res, next) => {
  try {
    const wards = await list(Ward, "wards");
    const ward = wards.find(
      (item) => String(item._id) === String(req.params.id),
    );
    const bed = ward?.beds.find(
      (item) => String(item._id) === String(req.params.bedId),
    );
    if (!bed) throw new AppError("Bed not found", 404);
    if (bed.status === "Occupied")
      throw new AppError("Cannot delete an occupied bed", 409);
    if (connected())
      await Ward.updateOne(
        { _id: req.params.id },
        { $pull: { beds: { _id: req.params.bedId } } },
      );
    else ward.beds.splice(ward.beds.indexOf(bed), 1);
    await emitDashboardUpdate();
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

exports.getAdmissions = async (req, res, next) => {
  try {
    const admissions = await list(Admission, "admissions");
    res.json(
      req.query.status
        ? admissions.filter((item) => item.status === req.query.status)
        : admissions,
    );
  } catch (error) {
    next(error);
  }
};

exports.createAdmission = async (req, res, next) => {
  try {
    const { patientId, wardId, bedId: selectedBedId } = req.body;
    const admissions = await list(Admission, "admissions");
    if (
      admissions.some(
        (item) =>
          String(item.patientId) === String(patientId) &&
          item.status === "Admitted",
      )
    )
      throw new AppError("Patient already has an active IPD admission", 409);
    const patients = await list(Patient, "patients");
    const patient = patients.find(
      (item) => String(item._id) === String(patientId),
    );
    if (!patient) throw new AppError("Patient not found", 404);
    let ward;
    let bed;
    if (connected()) {
      ward = await Ward.findOneAndUpdate(
        {
          _id: wardId,
          beds: { $elemMatch: { _id: selectedBedId, status: "Available" } },
        },
        {
          $set: {
            "beds.$.status": "Occupied",
            "beds.$.patientId": String(patientId),
          },
        },
        { new: true },
      );
      bed = ward?.beds.id(selectedBedId);
    } else {
      ward = (await list(Ward, "wards")).find((item) => item._id === wardId);
      bed = ward?.beds.find(
        (item) => item._id === selectedBedId && item.status === "Available",
      );
      if (bed) {
        bed.status = "Occupied";
        bed.patientId = patientId;
      }
    }
    if (!ward || !bed)
      throw new AppError("Selected bed is no longer available", 409);
    const admission = await create(Admission, "admissions", {
      admissionNumber: code(),
      patientId: String(patient._id),
      patientCode: patient.patientId,
      patientName: patient.name,
      sourceVisitId: req.body.sourceVisitId || "",
      doctor: req.body.doctor,
      diagnosis: req.body.diagnosis || "",
      wardId: String(ward._id),
      wardName: ward.name,
      bedId: String(bed._id),
      bedNumber: bed.bedNumber,
      bedStays: [
        {
          wardId: String(ward._id),
          wardName: ward.name,
          bedId: String(bed._id),
          bedNumber: bed.bedNumber,
          dailyRate: Number(bed.dailyRate) || 0,
          startedAt: new Date(),
        },
      ],
      doctorCharges: [],
      advances: [],
      status: "Admitted",
      admittedAt: new Date(),
    });
    await emitDashboardUpdate();
    res.status(201).json(admission);
  } catch (error) {
    next(error);
  }
};

exports.transferAdmission = async (req, res, next) => {
  try {
    const admissions = await list(Admission, "admissions");
    const current = admissions.find(
      (item) => String(item._id) === String(req.params.id),
    );
    if (!current || current.status !== "Admitted")
      throw new AppError("Active admission not found", 404);
    const { wardId, bedId: destinationBedId } = req.body;
    if (
      String(current.wardId) === String(wardId) &&
      String(current.bedId) === String(destinationBedId)
    )
      throw new AppError("Patient is already allocated to this bed", 400);

    let destinationWard;
    let destinationBed;
    if (connected()) {
      destinationWard = await Ward.findOneAndUpdate(
        {
          _id: wardId,
          beds: {
            $elemMatch: { _id: destinationBedId, status: "Available" },
          },
        },
        {
          $set: {
            "beds.$.status": "Occupied",
            "beds.$.patientId": String(current.patientId),
          },
        },
        { new: true },
      );
      destinationBed = destinationWard?.beds.id(destinationBedId);
      if (!destinationWard || !destinationBed)
        throw new AppError("Destination bed is no longer available", 409);
      try {
        await Ward.updateOne(
          { _id: current.wardId, "beds._id": current.bedId },
          {
            $set: {
              "beds.$.status": "Available",
              "beds.$.patientId": null,
            },
          },
        );
      } catch (error) {
        await Ward.updateOne(
          { _id: destinationWard._id, "beds._id": destinationBed._id },
          {
            $set: {
              "beds.$.status": "Available",
              "beds.$.patientId": null,
            },
          },
        );
        throw error;
      }
    } else {
      const wards = await list(Ward, "wards");
      destinationWard = wards.find(
        (item) => String(item._id) === String(wardId),
      );
      destinationBed = destinationWard?.beds.find(
        (item) =>
          String(item._id) === String(destinationBedId) &&
          item.status === "Available",
      );
      if (!destinationBed)
        throw new AppError("Destination bed is no longer available", 409);
      const oldWard = wards.find(
        (item) => String(item._id) === String(current.wardId),
      );
      const oldBed = oldWard?.beds.find(
        (item) => String(item._id) === String(current.bedId),
      );
      destinationBed.status = "Occupied";
      destinationBed.patientId = current.patientId;
      if (oldBed) {
        oldBed.status = "Available";
        oldBed.patientId = null;
      }
    }
    const transferredAt = new Date();
    const bedStays = current.bedStays?.length
      ? current.bedStays.map((stay) => ({ ...(stay.toObject?.() || stay) }))
      : [
          {
            wardId: current.wardId,
            wardName: current.wardName,
            bedId: current.bedId,
            bedNumber: current.bedNumber,
            dailyRate: 0,
            startedAt: current.admittedAt,
          },
        ];
    const openStay = [...bedStays].reverse().find((stay) => !stay.endedAt);
    if (openStay) openStay.endedAt = transferredAt;
    bedStays.push({
      wardId: String(destinationWard._id),
      wardName: destinationWard.name,
      bedId: String(destinationBed._id),
      bedNumber: destinationBed.bedNumber,
      dailyRate: Number(destinationBed.dailyRate) || 0,
      startedAt: transferredAt,
    });
    const admission = await update(Admission, "admissions", req.params.id, {
      wardId: String(destinationWard._id),
      wardName: destinationWard.name,
      bedId: String(destinationBed._id),
      bedNumber: destinationBed.bedNumber,
      bedStays,
    });
    await emitDashboardUpdate();
    res.json(admission);
  } catch (error) {
    next(error);
  }
};

exports.dischargeAdmission = async (req, res, next) => {
  try {
    const admissions = await list(Admission, "admissions");
    const current = admissions.find(
      (item) => String(item._id) === String(req.params.id),
    );
    if (!current || current.status !== "Admitted")
      throw new AppError("Active admission not found", 404);
    if (connected()) {
      await Ward.updateOne(
        { _id: current.wardId, "beds._id": current.bedId },
        { $set: { "beds.$.status": "Available", "beds.$.patientId": null } },
      );
    } else {
      const ward = (await list(Ward, "wards")).find(
        (item) => item._id === current.wardId,
      );
      const bed = ward?.beds.find((item) => item._id === current.bedId);
      if (bed) {
        bed.status = "Available";
        bed.patientId = null;
      }
    }
    const dischargedAt = new Date();
    const bedStays = (current.bedStays || []).map((stay) => ({
      ...(stay.toObject?.() || stay),
    }));
    const openStay = [...bedStays].reverse().find((stay) => !stay.endedAt);
    if (openStay) openStay.endedAt = dischargedAt;
    const admission = await update(Admission, "admissions", req.params.id, {
      status: "Discharged",
      dischargedAt,
      bedStays,
    });
    await emitDashboardUpdate();
    res.json(admission);
  } catch (error) {
    next(error);
  }
};

const findAdmission = async (id) => {
  const admissions = await list(Admission, "admissions");
  return admissions.find((item) => String(item._id) === String(id));
};

const calculateBedItems = (stays, admission, now, rules) => {
  if (rules.calculationMethod === "HighestPerDay") {
    const days = new Map();
    stays.forEach((stay) => {
      const start = new Date(stay.startedAt || admission.admittedAt);
      const end = new Date(stay.endedAt || now);
      const cursor = new Date(start);
      cursor.setHours(0, 0, 0, 0);
      while (cursor < end) {
        const dayEnd = new Date(cursor);
        dayEnd.setDate(dayEnd.getDate() + 1);
        if (start < dayEnd && end > cursor) {
          const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
          const candidate = {
            date,
            wardName: stay.wardName,
            bedNumber: stay.bedNumber,
            dailyRate: Number(stay.dailyRate) || 0,
          };
          if (!days.has(date) || candidate.dailyRate > days.get(date).dailyRate)
            days.set(date, candidate);
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return [...days.values()].map((day) => ({
      code: "IPD-BED",
      name: `${day.date} · Highest category (${day.wardName}, Bed ${day.bedNumber})`,
      rate: day.dailyRate,
      quantity: 1,
      amount: day.dailyRate,
      category: "Bed",
    }));
  }
  return stays.map((stay) => {
    const start = new Date(stay.startedAt || admission.admittedAt);
    const end = new Date(stay.endedAt || now);
    const actualMinutes = Math.max(0, (end - start) / 60000);
    const afterGrace = Math.max(
      0,
      actualMinutes - Number(rules.graceMinutes || 0),
    );
    const hours =
      rules.calculationMethod === "MinimumGrace"
        ? afterGrace
          ? Math.max(
              Number(rules.minimumHours || 0),
              Math.ceil(afterGrace / 60),
            )
          : 0
        : Math.round((actualMinutes / 60) * 100) / 100;
    const hourlyRate = (Number(stay.dailyRate) || 0) / 24;
    return {
      code: "IPD-BED",
      name: `${stay.wardName} · Bed ${stay.bedNumber}`,
      rate: hourlyRate,
      quantity: hours,
      amount: hourlyRate * hours,
      category: "Bed",
      startedAt: start,
      endedAt: end,
    };
  });
};

const buildBillPreview = async (admission) => {
  const now = admission.dischargedAt || new Date();
  let stays = admission.bedStays || [];
  if (!stays.length) {
    const wards = await list(Ward, "wards");
    const ward = wards.find(
      (item) => String(item._id) === String(admission.wardId),
    );
    const bed = ward?.beds.find(
      (item) => String(item._id) === String(admission.bedId),
    );
    stays = [
      {
        wardName: admission.wardName,
        bedNumber: admission.bedNumber,
        dailyRate: Number(bed?.dailyRate) || 0,
        startedAt: admission.admittedAt,
        endedAt: now,
      },
    ];
  }
  const rules =
    (await getMaster(IpdBillingRules, "ipdBillingRules")) ||
    defaultBillingRules;
  const bedItems = calculateBedItems(stays, admission, now, rules);
  const doctorItems = (admission.doctorCharges || []).map((charge) => ({
    code: "IPD-DOC",
    name: charge.description || `Consultation · ${charge.doctor}`,
    rate: Number(charge.amount) || 0,
    quantity: 1,
    amount: Number(charge.amount) || 0,
    category: "Doctor",
    chargedAt: charge.chargedAt,
  }));
  const items = [...bedItems, ...doctorItems];
  const advanceTotal = (admission.advances || []).reduce(
    (sum, payment) => sum + (Number(payment.amount) || 0),
    0,
  );
  return {
    admissionId: admission._id,
    admissionNumber: admission.admissionNumber,
    patientName: admission.patientName,
    patientCode: admission.patientCode,
    billingRules: rules,
    items,
    subtotal: items.reduce((sum, item) => sum + item.amount, 0),
    advances: admission.advances || [],
    advanceTotal,
  };
};

exports.addDoctorCharge = async (req, res, next) => {
  try {
    const admission = await findAdmission(req.params.id);
    if (!admission) throw new AppError("Admission not found", 404);
    if (admission.billedAt)
      throw new AppError("This admission has already been billed", 409);
    const amount = Number(req.body.amount);
    if (!req.body.doctor || amount <= 0)
      throw new AppError("Doctor and valid consultation fee are required", 400);
    const doctorCharges = [
      ...(admission.doctorCharges || []).map((item) => ({
        ...(item.toObject?.() || item),
      })),
      {
        doctor: req.body.doctor,
        description: req.body.description || "Doctor consultation",
        amount,
        chargedAt: new Date(),
      },
    ];
    res
      .status(201)
      .json(
        await update(Admission, "admissions", req.params.id, { doctorCharges }),
      );
  } catch (error) {
    next(error);
  }
};

exports.addAdvancePayment = async (req, res, next) => {
  try {
    const admission = await findAdmission(req.params.id);
    if (!admission) throw new AppError("Admission not found", 404);
    if (admission.billedAt)
      throw new AppError("Cannot add an advance after final billing", 409);
    const amount = Number(req.body.amount);
    if (amount <= 0)
      throw new AppError("A valid advance amount is required", 400);
    const advances = [
      ...(admission.advances || []).map((item) => ({
        ...(item.toObject?.() || item),
      })),
      {
        amount,
        paymentMode: req.body.paymentMode || "Cash",
        reference: String(req.body.reference || "").trim(),
        paidAt: new Date(),
      },
    ];
    res
      .status(201)
      .json(await update(Admission, "admissions", req.params.id, { advances }));
  } catch (error) {
    next(error);
  }
};

exports.getBillPreview = async (req, res, next) => {
  try {
    const admission = await findAdmission(req.params.id);
    if (!admission) throw new AppError("Admission not found", 404);
    res.json(await buildBillPreview(admission));
  } catch (error) {
    next(error);
  }
};

exports.createIpdBill = async (req, res, next) => {
  try {
    const admission = await findAdmission(req.params.id);
    if (!admission) throw new AppError("Admission not found", 404);
    if (admission.billedAt)
      throw new AppError("This admission has already been billed", 409);
    if (admission.status !== "Discharged")
      throw new AppError(
        "Discharge the patient before creating the final IPD bill",
        409,
      );
    const preview = await buildBillPreview(admission);
    const discount = Math.max(0, Number(req.body.discount) || 0);
    const balanceBeforeAdvance = Math.max(0, preview.subtotal - discount);
    const advancePaid = preview.advanceTotal;
    const invoice = await create(Invoice, "invoices", {
      invoiceNumber: `IPD-INV-${Date.now().toString().slice(-8)}`,
      patientId: admission.patientId,
      patientName: admission.patientName,
      invoiceType: "IPD",
      items: preview.items,
      subtotal: preview.subtotal,
      discount,
      advancePaid,
      balanceBeforeAdvance,
      total: Math.max(0, balanceBeforeAdvance - advancePaid),
      paymentMode: req.body.paymentMode || "Cash",
      status: "Paid",
    });
    await update(Admission, "admissions", req.params.id, {
      billedAt: new Date(),
      invoiceId: String(invoice._id),
    });
    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
};
