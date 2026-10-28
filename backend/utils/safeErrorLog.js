export function safeErrorLog(req, err, statusCode) {
  return {
    method: req.method,
    path: req.path,
    statusCode,
    errorName: err.name || 'Error'
  }
}

export function publicErrorMessage(statusCode) {
  if (statusCode === 413) return 'Request body is too large.'
  if (statusCode < 500) return 'Invalid request.'
  return 'An internal error occurred. Please try again later.'
}
