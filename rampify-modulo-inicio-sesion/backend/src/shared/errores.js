class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function asyncHandler(funcion) {
  return (req, res, next) => Promise.resolve(funcion(req, res, next)).catch(next);
}

module.exports = { AppError, asyncHandler };
