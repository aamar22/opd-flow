const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    patientId: { type: String, required: true },
    patientName: { type: String, required: true },
    doctor: { type: String, required: true },
    department: { type: String, required: true },
    symptoms: { type: String, required: true },
    status: {
      type: String,
      enum: ["Waiting", "Completed", "Dispensed"],
      default: "Waiting",
    },
    diagnosis: String,
    notes: String,
    chiefComplaint: String,
    chiefComplaints: [String],
    allergies: [String],
    diagnoses: [String],
    clinicalNotes: [String],
    vitals: {
      temperature: String,
      pulse: String,
      systolic: String,
      diastolic: String,
      respiratoryRate: String,
      spo2: String,
      weight: String,
    },
    vitalHistory: [
      {
        temperature: String,
        pulse: String,
        systolic: String,
        diastolic: String,
        respiratoryRate: String,
        spo2: String,
        weight: String,
        recordedAt: { type: Date, default: Date.now },
      },
    ],
    medicines: [{ name: String, dosage: String, days: Number }],
  },
  { timestamps: true },
);
schema.index({ createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });
schema.index({ patientId: 1, createdAt: -1 });
module.exports = mongoose.model("Visit", schema);
