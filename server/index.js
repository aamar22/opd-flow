const app = require("./app");
const { createServer } = require("http");
const { initializeDashboardSocket } = require("./realtime/dashboardSocket");
const connectDatabase = require("./config/database");
const PORT = process.env.PORT || 5000;
async function start() {
  await connectDatabase();
  const httpServer = createServer(app);
  initializeDashboardSocket(httpServer);
  httpServer.listen(PORT, () =>
    console.log(`API running on port ${PORT}`),
  );
}
start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
