/**
 * Safely extracts a user-friendly error string from any error object,
 * Axios error response, or string. Guarantees a string is returned,
 * preventing React runtime crashes when objects are passed to toasts or JSX.
 */
export function extractErrorMessage(error, fallback = 'An unexpected error occurred. Please try again.') {
  if (!error) return fallback
  if (typeof error === 'string') return error

  const resData = error.response?.data
  if (typeof resData?.error === 'string' && resData.error.trim()) {
    return resData.error.trim()
  }
  if (typeof resData?.error?.message === 'string' && resData.error.message.trim()) {
    return resData.error.message.trim()
  }
  if (typeof resData?.message === 'string' && resData.message.trim()) {
    return resData.message.trim()
  }
  if (typeof error.message === 'string' && error.message.trim() && !error.message.includes('[object Object]')) {
    return error.message.trim()
  }

  return fallback
}
