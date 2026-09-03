const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    patientId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ["Male", "Female", "Other"], required: true },
    phone: { type: String, required: true, trim: true },
    address: String,
  },
  { timestamps: true },
);
schema.index({ name: 1 });
schema.index({ phone: 1 });
module.exports = mongoose.model("Patient", schema);
