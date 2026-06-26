import { createContext, useContext, useState, useEffect } from 'react'
import { signin as signinApi, signup as signupApi, getMe } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('prgenie_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function validateToken() {
      if (token) {
        try {
          const data = await getMe(token)
          setUser(data.user)
        } catch {
          localStorage.removeItem('prgenie_token')
          setToken(null)
          setUser(null)
        }
      }
      setLoading(false)
    }
    validateToken()
  }, [token])

  const login = async (email, password) => {
    const data = await signinApi(email, password)
    localStorage.setItem('prgenie_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const signup = async (name, email, password) => {
    const data = await signupApi(name, email, password)
    localStorage.setItem('prgenie_token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('prgenie_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
