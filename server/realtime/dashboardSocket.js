const { Server } = require("socket.io");
const { getDashboardStats } = require("../controllers/dashboardController");

let io;

const initializeDashboardSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || "http://localhost:5173" },
  });
  io.on("connection", async (socket) => {
    socket.emit("dashboard:update", await getDashboardStats());
  });
};

const emitDashboardUpdate = async () => {
  if (io) io.emit("dashboard:update", await getDashboardStats());
};

module.exports = { initializeDashboardSocket, emitDashboardUpdate };
