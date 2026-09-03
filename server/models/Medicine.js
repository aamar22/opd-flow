const mongoose = require("mongoose");
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    batchNumber: { type: String, required: true, trim: true },
    vendorName: { type: String, required: true, trim: true },
    orderDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    stock: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    reorder: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);
schema.index(
  { name: 1, batchNumber: 1, vendorName: 1 },
  { unique: true, sparse: true },
);
module.exports = mongoose.model("Medicine", schema);
