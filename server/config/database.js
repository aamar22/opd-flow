const mongoose = require("mongoose");
module.exports = async function connectDatabase() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/opd_flow",
      { serverSelectionTimeoutMS: 1200 },
    );
    console.log("MongoDB connected");
  } catch (error) {
    console.warn("MongoDB unavailable — using in-memory development store.");
  }
};
