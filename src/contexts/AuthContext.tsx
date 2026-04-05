/**
 * Authentication Context for Dung Craft
 * Provides user authentication state and methods throughout the app
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

// Types
export interface User {
  id: string
  email: string
  username: string
  avatar_url?: string
  role: 'user' | 'admin' | 'moderator'
  created_at: string
  total_beads_earned: number
  highest_level: number
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  
  // Auth methods
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string) => Promise<void>
  signOut: () => Promise<void>
  signInAsGuest: () => void
  
  // Profile methods
  updateProfile: (data: Partial<User>) => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
}

// Default guest user for offline play
const GUEST_USER: User = {
  id: 'guest',
  email: 'guest@dungcraft.local',
  username: 'Guest Beetle',
  role: 'user',
  created_at: new Date().toISOString(),
  total_beads_earned: 0,
  highest_level: 0,
}

const AuthContext = createContext<AuthState | null>(null)

// Local storage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'dc_access_token',
  REFRESH_TOKEN: 'dc_refresh_token',
  USER: 'dc_user',
  GUEST_MODE: 'dc_guest_mode',
}

// API base URL
const API_URL = import.meta.env.VITE_API_URL || ''

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check for guest mode first
        const isGuest = localStorage.getItem(STORAGE_KEYS.GUEST_MODE) === 'true'
        if (isGuest) {
          const savedUser = localStorage.getItem(STORAGE_KEYS.USER)
          if (savedUser) {
            setUser(JSON.parse(savedUser))
          } else {
            setUser(GUEST_USER)
          }
          setLoading(false)
          return
        }

        // Check for access token
        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
        if (!accessToken) {
          setLoading(false)
          return
        }

        // Validate token and get user
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        } else if (response.status === 401) {
          // Try to refresh token
          await refreshAccessToken()
        } else {
          // Clear invalid session
          clearSession()
        }
      } catch (err) {
        console.error('[v0] Auth initialization error:', err)
        clearSession()
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  // Refresh access token using refresh token
  const refreshAccessToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
    if (!refreshToken) return false

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token)
        if (data.refresh_token) {
          localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token)
        }
        setUser(data.user)
        return true
      }
    } catch (err) {
      console.error('[v0] Token refresh error:', err)
    }

    clearSession()
    return false
  }

  // Clear all session data
  const clearSession = () => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
    localStorage.removeItem(STORAGE_KEYS.GUEST_MODE)
    setUser(null)
  }

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string) => {
    setError(null)
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store tokens
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token)
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token)
      localStorage.removeItem(STORAGE_KEYS.GUEST_MODE)
      
      setUser(data.user)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Sign up new user
  const signUp = useCallback(async (email: string, password: string, username: string) => {
    setError(null)
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // Auto-login after registration
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access_token)
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token)
      localStorage.removeItem(STORAGE_KEYS.GUEST_MODE)
      
      setUser(data.user)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
      if (accessToken) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        })
      }
    } catch (err) {
      console.error('[v0] Logout error:', err)
    } finally {
      clearSession()
    }
  }, [])

  // Sign in as guest (offline mode)
  const signInAsGuest = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.GUEST_MODE, 'true')
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(GUEST_USER))
    setUser(GUEST_USER)
    setError(null)
  }, [])

  // Update user profile
  const updateProfile = useCallback(async (data: Partial<User>) => {
    if (!user) return

    // Guest mode - update locally only
    if (user.id === 'guest') {
      const updatedUser = { ...user, ...data }
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser))
      setUser(updatedUser)
      return
    }

    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    if (!accessToken) return

    try {
      const response = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        const result = await response.json()
        setUser(result.user)
      }
    } catch (err) {
      console.error('[v0] Profile update error:', err)
    }
  }, [user])

  // Refresh user data
  const refreshUser = useCallback(async () => {
    if (!user || user.id === 'guest') return

    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    if (!accessToken) return

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (err) {
      console.error('[v0] User refresh error:', err)
    }
  }, [user])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value: AuthState = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    signInAsGuest,
    updateProfile,
    refreshUser,
    clearError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Hook for requiring authentication
export function useRequireAuth(redirectTo?: string) {
  const auth = useAuth()
  
  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated && redirectTo) {
      // In a real app, you'd use a router here
      console.warn('[v0] User not authenticated, should redirect to:', redirectTo)
    }
  }, [auth.loading, auth.isAuthenticated, redirectTo])

  return auth
}
