import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL, apiClient, configureApiAuth } from '../utils/apiClient'

const AuthContext = createContext(null)

function messageFrom(error, fallback) {
  return error?.response?.data?.error?.message || error?.response?.data?.message || fallback
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const accessTokenRef = useRef(null)
  const csrfTokenRef = useRef(null)
  const refreshInFlightRef = useRef(null)

  const setSession = useCallback((payload) => {
    accessTokenRef.current = payload.accessToken || null
    setAccessToken(payload.accessToken || null)
    setUser(payload.user || null)
    csrfTokenRef.current = payload.csrfToken || null
  }, [])

  const clearSession = useCallback(() => {
    accessTokenRef.current = null
    setAccessToken(null)
    setUser(null)
    csrfTokenRef.current = null
  }, [])

  const refreshSession = useCallback(() => {
    if (refreshInFlightRef.current) return refreshInFlightRef.current
    refreshInFlightRef.current = (async () => {
      const csrfResponse = await axios.get(`${API_BASE_URL}/api/auth/csrf`, { withCredentials: true })
      const csrfToken = csrfResponse.data.csrfToken
      const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {}, {
        withCredentials: true,
        headers: { 'X-CSRF-Token': csrfToken }
      })
      setSession(response.data)
      return response.data.accessToken
    })().catch(error => {
      clearSession()
      throw error
    }).finally(() => {
      refreshInFlightRef.current = null
    })
    return refreshInFlightRef.current
  }, [clearSession, setSession])

  useEffect(() => {
    configureApiAuth({
      getAccessToken: () => accessTokenRef.current,
      refreshSession,
      onSessionExpired: clearSession
    })
  }, [clearSession, refreshSession])

  useEffect(() => {
    let mounted = true
    refreshSession().catch(() => {}).finally(() => {
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [refreshSession])

  const login = useCallback(async (credentials) => {
    try {
      const response = await apiClient.post('/api/auth/login', credentials)
      setSession(response.data)
      return response.data.user
    } catch (error) {
      throw new Error(messageFrom(error, 'Sign-in failed. Please try again.'))
    }
  }, [setSession])

  const register = useCallback(async (details) => {
    try {
      const response = await apiClient.post('/api/auth/register', details)
      return response.data
    } catch (error) {
      throw new Error(messageFrom(error, 'Registration failed. Please try again.'))
    }
  }, [])

  const verifyEmail = useCallback(async (token) => {
    try {
      const response = await apiClient.post('/api/auth/verify-email', { token })
      return response.data
    } catch (error) {
      throw new Error(messageFrom(error, 'This verification link is invalid or expired.'))
    }
  }, [])

  const requestPasswordReset = useCallback(async (email) => {
    try {
      const response = await apiClient.post('/api/auth/forgot-password', { email })
      return response.data
    } catch (error) {
      throw new Error(messageFrom(error, 'Password recovery is temporarily unavailable.'))
    }
  }, [])

  const resetPassword = useCallback(async (token, password) => {
    try {
      const response = await apiClient.post('/api/auth/reset-password', { token, password })
      clearSession()
      return response.data
    } catch (error) {
      throw new Error(messageFrom(error, 'Password reset failed. The link may have expired.'))
    }
  }, [clearSession])

  const logout = useCallback(async () => {
    try {
      if (csrfTokenRef.current) {
        await axios.post(`${API_BASE_URL}/api/auth/logout`, {}, {
          withCredentials: true,
          headers: { 'X-CSRF-Token': csrfTokenRef.current }
        })
      }
    } finally {
      clearSession()
    }
  }, [clearSession])

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user && accessToken),
    login,
    register,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    logout
  }), [user, accessToken, loading, login, register, verifyEmail, requestPasswordReset, resetPassword, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider.')
  return value
}
