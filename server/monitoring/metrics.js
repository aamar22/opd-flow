const client = require("prom-client");

const register = new client.Registry();
client.collectDefaultMetrics({
  register,
  prefix: "opd_",
});

const httpRequestDuration = new client.Histogram({
  name: "opd_http_request_duration_seconds",
  help: "HTTP request duration in seconds.",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: "opd_http_requests_total",
  help: "Total HTTP requests.",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

const routeName = (req) => {
  if (req.route?.path) return `${req.baseUrl || ""}${req.route.path}`;
  return "unmatched";
};

const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    if (req.path === "/metrics") return;
    const labels = {
      method: req.method,
      route: routeName(req),
      status_code: String(res.statusCode),
    };
    const duration = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequestDuration.observe(labels, duration);
    httpRequestsTotal.inc(labels);
  });
  next();
};

const metricsHandler = async (_req, res, next) => {
  try {
    res.set("Content-Type", register.contentType);
    res.send(await register.metrics());
  } catch (error) {
    next(error);
  }
};

module.exports = { metricsHandler, metricsMiddleware };
