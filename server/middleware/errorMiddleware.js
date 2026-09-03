const notFound = (req, _res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};
const errorHandler = (error, _req, res, _next) => {
  console.error(error.message);
  res
    .status(error.statusCode || 500)
    .json({ message: error.message || "Internal server error" });
};
module.exports = { notFound, errorHandler };
