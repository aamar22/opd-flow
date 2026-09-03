const mongoose = require("mongoose");

module.exports = mongoose.model(
  "IpdBillingRules",
  new mongoose.Schema(
    {
      calculationMethod: {
        type: String,
        enum: ["Prorated", "HighestPerDay", "MinimumGrace"],
        default: "Prorated",
      },
      graceMinutes: { type: Number, default: 15, min: 0 },
      minimumHours: { type: Number, default: 1, min: 0 },
    },
    { timestamps: true },
  ),
);
