const mongoose = require("mongoose");

const bedSchema = new mongoose.Schema({
  bedNumber: { type: String, required: true, trim: true },
  bedType: { type: String, default: "Standard" },
  dailyRate: { type: Number, default: 0, min: 0 },
  status: {
    type: String,
    enum: ["Available", "Occupied", "Maintenance"],
    default: "Available",
  },
  patientId: { type: String, default: null },
});

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    floor: { type: String, required: true, trim: true },
    wardType: { type: String, required: true, trim: true },
    beds: { type: [bedSchema], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Ward", schema);
