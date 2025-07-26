class AppError extends Error {
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true; // Mark as operational error (known error)

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
