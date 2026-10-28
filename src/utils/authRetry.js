export function shouldRefreshAfterUnauthorized(error) {
  const request = error?.config
  const isAuthEndpoint = typeof request?.url === 'string' && request.url.includes('/api/auth/')
  return error?.response?.status === 401 && Boolean(request) && !request._authRetry && !isAuthEndpoint
}
