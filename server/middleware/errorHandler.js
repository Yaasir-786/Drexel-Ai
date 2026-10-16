const notFound = (req, res) => {
  res.status(404).json({ message: "Route Not Found..." });
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let statusCode = res.statusCode >= 400 ? res.statusCode : 500;
  let message = err.message;

  if (err.name === "MulterError") {
    statusCode = 400;
    message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File Is Too Large (Max 5 MB)..."
        : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
          ? "Too Many Files (Max 3)..."
          : err.message;
  } else if (err.type === "entity.parse.failed") {
    statusCode = 400;
    message = "Invalid JSON Body...";
  } else if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "Request Body Is Too Large...";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID...";
  } else if (err.name === "ValidationError") {
    statusCode = 400;
  } else if (err.code === 11000) {
    statusCode = 409;
    message = "Already Exists...";
  } else if (statusCode === 500 && err.status >= 400 && err.status < 500) {
    statusCode = err.status;
  }

  // never leak internal error details in production
  if (statusCode === 500 && process.env.NODE_ENV === "production") {
    message = "Something Went Wrong...";
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : null,
  });
};

export { notFound };
export default errorHandler;
