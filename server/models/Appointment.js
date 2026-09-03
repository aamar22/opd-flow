const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    patientId: { type: String, required: true },
    patientName: { type: String, required: true },
    doctor: { type: String, required: true },
    department: { type: String, required: true },
    appointmentDate: { type: String, required: true },
    appointmentTime: { type: String, required: true },
    endTime: String,
    appointmentType: { type: String, default: "New" },
    paymentMode: String,
    amount: Number,
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled",
    },
  },
  { timestamps: true },
);
schema.index({ appointmentDate: 1, appointmentTime: 1 });
module.exports = mongoose.model("Appointment", schema);
