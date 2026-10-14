const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err);

  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Internal server error'
    }
  });
};

module.exports = errorHandler;
