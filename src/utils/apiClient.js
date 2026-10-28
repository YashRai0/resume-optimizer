import axios from 'axios'
import { getBearerHeaders } from './authHeaders'
import { shouldRefreshAfterUnauthorized } from './authRetry'

export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || ''
export const apiClient = axios.create({ baseURL: API_BASE_URL })

let authCallbacks = {
  getAccessToken: () => null,
  refreshSession: async () => { throw new Error('Authentication is unavailable.') },
  onSessionExpired: () => {}
}

export function configureApiAuth(callbacks) {
  authCallbacks = { ...authCallbacks, ...callbacks }
}

apiClient.interceptors.request.use(async config => {
  const url = config.url || ''
  if (url.includes('/api/auth/')) config.withCredentials = true
  if (!url.includes('/api/auth/')) {
    const token = authCallbacks.getAccessToken()
    config.headers = config.headers || {}
    Object.assign(config.headers, getBearerHeaders(token))
  }
  return config
})

let refreshInFlight = null
apiClient.interceptors.response.use(response => response, async error => {
  const request = error.config
  if (!shouldRefreshAfterUnauthorized(error)) {
    return Promise.reject(error)
  }

  request._authRetry = true
  try {
    if (!refreshInFlight) {
      refreshInFlight = authCallbacks.refreshSession().finally(() => { refreshInFlight = null })
    }
    const token = await refreshInFlight
    if (!token) throw new Error('Session refresh failed.')
    request.headers = request.headers || {}
    request.headers.Authorization = `Bearer ${token}`
    return apiClient(request)
  } catch (refreshError) {
    authCallbacks.onSessionExpired()
    return Promise.reject(error)
  }
})
