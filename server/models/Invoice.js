const mongoose = require("mongoose");
const itemSchema = new mongoose.Schema(
  {
    serviceId: String,
    code: String,
    name: String,
    rate: Number,
    quantity: Number,
    amount: Number,
  },
  { _id: false },
);
module.exports = mongoose.model(
  "Invoice",
  new mongoose.Schema(
    {
      invoiceNumber: { type: String, required: true, unique: true },
      patientId: { type: String, required: true },
      patientName: { type: String, required: true },
      invoiceType: {
        type: String,
        enum: ["Service", "Pharmacy", "IPD"],
        default: "Service",
      },
      items: { type: [itemSchema], default: [] },
      subtotal: Number,
      discount: { type: Number, default: 0 },
      advancePaid: { type: Number, default: 0 },
      balanceBeforeAdvance: { type: Number, default: 0 },
      total: Number,
      paymentMode: { type: String, default: "Cash" },
      status: { type: String, default: "Paid" },
    },
    { timestamps: true },
  ),
);
