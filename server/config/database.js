const mongoose = require("mongoose");
module.exports = async function connectDatabase() {
  if (process.env.DEMO_MODE === "true") {
    console.log("Demo mode: temporary in-memory data; no database connection.");
    return;
  }
  const production = process.env.NODE_ENV === "production";
  if (production && !process.env.MONGODB_URI) {
    throw new Error("Set MONGODB_URI in Render before disabling DEMO_MODE.");
  }
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/opd_flow",
      { serverSelectionTimeoutMS: production ? 10000 : 1200 },
    );
    console.log("MongoDB connected");
  } catch (error) {
    if (production) {
      throw new Error("MongoDB connection failed. Check MONGODB_URI, database credentials, and Atlas network access.");
    }
    console.warn("MongoDB unavailable - using in-memory development store.");
  }
};
