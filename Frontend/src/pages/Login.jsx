import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { showToast } from '../components/Toast'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2, Sparkles, ArrowRight } from 'lucide-react'

function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login, signup } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError('Name is required')
          setLoading(false)
          return
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters')
          setLoading(false)
          return
        }
        await signup(name, email, password)
        showToast('Account created successfully! Welcome to PRGenie 🎉')
      } else {
        await login(email, password)
        showToast('Welcome back! 👋')
      }
      navigate('/dashboard')
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Something went wrong'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-16 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse,rgba(124,58,237,0.1)_0%,transparent_70%)] pointer-events-none z-0"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-xl font-bold text-white mb-4">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-extrabold text-white">
              P
            </span>
            <span>PRGenie</span>
          </Link>
          <h1 className="text-2xl font-bold mt-4 mb-2">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-gray-400 text-sm">
            {isSignUp ? 'Start reviewing code with AI' : 'Sign in to continue to PRGenie'}
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Tab Switcher */}
            <div className="flex bg-[#16161f] rounded-lg p-1 mb-2">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setError('') }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                  !isSignUp ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setError('') }}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${
                  isSignUp ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Name field (sign up only) */}
            {isSignUp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-2"
              >
                <label className="text-sm font-medium text-gray-300">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-[#16161f] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  required={isSignUp}
                />
              </motion.div>
            )}

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-[#16161f] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#16161f] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all pr-12"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5"
              >
                {error}
              </motion.p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-xs text-gray-500">AI-POWERED CODE REVIEWS</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          {/* Feature callout */}
          <div className="flex items-center gap-3 text-xs text-gray-500 justify-center">
            <Sparkles size={14} className="text-purple-400" />
            <span>Powered by Google Gemini AI</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default Login
