const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    admissionNumber: { type: String, required: true, unique: true },
    patientId: { type: String, required: true },
    patientCode: String,
    patientName: { type: String, required: true },
    sourceVisitId: String,
    doctor: { type: String, required: true },
    diagnosis: String,
    wardId: { type: String, required: true },
    wardName: { type: String, required: true },
    bedId: { type: String, required: true },
    bedNumber: { type: String, required: true },
    admittedAt: { type: Date, default: Date.now },
    dischargedAt: Date,
    bedStays: [
      {
        wardId: String,
        wardName: String,
        bedId: String,
        bedNumber: String,
        dailyRate: Number,
        startedAt: Date,
        endedAt: Date,
      },
    ],
    doctorCharges: [
      {
        doctor: String,
        description: String,
        amount: Number,
        chargedAt: { type: Date, default: Date.now },
      },
    ],
    advances: [
      {
        amount: { type: Number, required: true, min: 0 },
        paymentMode: { type: String, default: "Cash" },
        reference: String,
        paidAt: { type: Date, default: Date.now },
      },
    ],
    billedAt: Date,
    invoiceId: String,
    status: {
      type: String,
      enum: ["Admitted", "Discharged"],
      default: "Admitted",
    },
  },
  { timestamps: true },
);

schema.index({ patientId: 1, status: 1 });
module.exports = mongoose.model("Admission", schema);
