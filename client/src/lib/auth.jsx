import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, tokens, ApiError } from './api'

const AuthContext = createContext(null)

/**
 * Session state for the SPA. The access token lives in localStorage and the api module
 * refreshes it transparently, so components only ever see "signed in" or "signed out".
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function restore() {
      if (!tokens.access) {
        setLoading(false)
        return
      }
      try {
        const { data } = await api.auth.me()
        if (!cancelled) setUser(data)
      } catch (err) {
        // An expired refresh token is a normal signed-out state, not an error to surface.
        if (err instanceof ApiError && err.status === 401) tokens.clear()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    restore()
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (credentials) => {
    const { data } = await api.auth.login(credentials)
    tokens.set(data.tokens)
    setUser(data.user)
    return data.user
  }, [])

  const signUp = useCallback(async (payload) => {
    const { data } = await api.auth.register(payload)
    tokens.set(data.tokens)
    setUser(data.user)
    return data.user
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.auth.logout()
    } catch {
      // Signing out locally must succeed even if the server is unreachable.
    }
    tokens.clear()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
