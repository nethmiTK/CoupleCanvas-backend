function notFound(req, res, next) {
  res.status(404);
  res.json({ error: 'Not Found' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line
  console.error(err);
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}

module.exports = { notFound, errorHandler };
