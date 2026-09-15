const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const connectDatabase = require("../server/config/database");

test("production requires Atlas and never falls back after a connection failure", async (t) => {
  const saved = { ...process.env };
  const originalConnect = mongoose.connect;
  t.after(() => {
    mongoose.connect = originalConnect;
    for (const key of ["NODE_ENV", "DEMO_MODE", "MONGODB_URI"]) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });
  process.env.NODE_ENV = "production";
  process.env.DEMO_MODE = "false";
  delete process.env.MONGODB_URI;
  await assert.rejects(connectDatabase(), /Set MONGODB_URI/);
  process.env.MONGODB_URI = "mongodb+srv://placeholder.invalid/clinavio";
  mongoose.connect = async () => { throw new Error("private driver details"); };
  await assert.rejects(connectDatabase(), (error) => {
    assert.match(error.message, /MongoDB connection failed/);
    assert.doesNotMatch(error.message, /private driver details/);
    return true;
  });
  let connected = false;
  mongoose.connect = async (uri, options) => {
    assert.equal(uri, process.env.MONGODB_URI);
    assert.equal(options.serverSelectionTimeoutMS, 10000);
    connected = true;
  };
  await connectDatabase();
  assert.equal(connected, true);
  connected = false;
  process.env.DEMO_MODE = "true";
  await connectDatabase();
  assert.equal(connected, false);
});
