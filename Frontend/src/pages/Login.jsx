import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register, login } from '../services/api'
import { Loader2, Mail, Lock, User } from 'lucide-react'
import { motion } from 'framer-motion'

function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (isRegister) {
        await register({ email, password, full_name: fullName })
        setSuccess('Registration successful! You can now log in.')
        setIsRegister(false)
        setPassword('')
      } else {
        const data = await login(email, password)
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('user_email', email)
        navigate('/dashboard')
      }
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pt-24 pb-12 min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#111118] border border-white/10 p-8 rounded-2xl shadow-xl"
      >
        <div className="text-center mb-8">
          <span className="inline-flex w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary items-center justify-center text-xl font-extrabold text-white mb-3">
            P
          </span>
          <h2 className="text-2xl font-bold">{isRegister ? 'Create your Account' : 'Welcome Back'}</h2>
          <p className="text-gray-400 text-sm mt-1">
            {isRegister ? 'Get started with automated PR reviews' : 'Sign in to access your dashboard'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-xs text-gray-400 font-medium">Full Name</label>
              <div className="flex items-center bg-[#16161f] border border-white/10 rounded-lg px-3 py-2 focus-within:border-primary/45 transition-all">
                <User size={16} className="text-gray-500 mr-2" />
                <input 
                  type="text" 
                  required
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-gray-300 w-full"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Email Address</label>
            <div className="flex items-center bg-[#16161f] border border-white/10 rounded-lg px-3 py-2 focus-within:border-primary/45 transition-all">
              <Mail size={16} className="text-gray-500 mr-2" />
              <input 
                type="email" 
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-gray-300 w-full"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-gray-400 font-medium">Password</label>
            <div className="flex items-center bg-[#16161f] border border-white/10 rounded-lg px-3 py-2 focus-within:border-primary/45 transition-all">
              <Lock size={16} className="text-gray-500 mr-2" />
              <input 
                type="password" 
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-gray-300 w-full"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          {success && <p className="text-green-400 text-xs mt-2">{success}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-primary py-2.5 mt-4 text-sm font-semibold flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Submitting...
              </>
            ) : (
              isRegister ? 'Register' : 'Sign In'
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <button 
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setSuccess('');
            }}
            className="text-xs text-gray-400 hover:text-primary transition-colors"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default Login
