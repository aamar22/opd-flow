const mongoose = require("mongoose");
module.exports = mongoose.model(
  "Service",
  new mongoose.Schema(
    {
      code: { type: String, required: true, unique: true, trim: true },
      name: { type: String, required: true, trim: true },
      category: { type: String, required: true, trim: true },
      rate: { type: Number, required: true, min: 0 },
      active: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);
