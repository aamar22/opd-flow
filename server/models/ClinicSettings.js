const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    day: { type: String, required: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false },
);
const doctorSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    department: { type: String, required: true },
    availability: { type: [availabilitySchema], default: [] },
  },
  { _id: false },
);
module.exports = mongoose.model(
  "ClinicSettings",
  new mongoose.Schema(
    {
      clinicName: { type: String, required: true, default: "ClinicFlow" },
      logoUrl: { type: String, default: "" },
      address: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      doctors: { type: [doctorSchema], default: [] },
    },
    { timestamps: true },
  ),
);
