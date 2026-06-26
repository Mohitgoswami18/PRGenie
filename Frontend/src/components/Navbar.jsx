import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { showToast } from './Toast'
import { LogOut, LayoutDashboard, GitBranch } from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
  { label: 'Home', target: 'hero' },
  { label: 'Features', target: 'features' },
  { label: 'How It Works', target: 'how-it-works' },
  { label: 'Pricing', target: 'pricing' },
  { label: 'About Us', target: 'about-us' },
]

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()

  const isLanding = location.pathname === '/'
  const isInnerPage = !isLanding

  // Track scroll for sticky effect and active section
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)

      if (!isLanding) return

      const sections = navItems.map(item => ({
        id: item.target,
        el: document.getElementById(item.target),
      })).filter(s => s.el)

      let current = 'hero'
      for (const section of sections) {
        const rect = section.el.getBoundingClientRect()
        if (rect.top <= 120) {
          current = section.id
        }
      }
      setActiveSection(current)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isLanding])

  const handleNavClick = (target) => {
    setMobileOpen(false)

    if (!isLanding) {
      navigate('/')
      // Delay scrolling to allow page to render
      setTimeout(() => {
        const el = document.getElementById(target)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 100)
      return
    }

    const el = document.getElementById(target)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleLogout = () => {
    logout()
    showToast('Logged out successfully')
    navigate('/')
    setMobileOpen(false)
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 h-16 backdrop-blur-md border-b flex items-center transition-all duration-300 ${
        scrolled
          ? 'bg-[#09090f]/95 border-white/10 shadow-lg shadow-black/20'
          : 'bg-[#09090f]/85 border-white/10'
      }`}
    >
      <div className="container mx-auto px-6 flex items-center justify-between w-full">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold text-white hover:opacity-80 transition-opacity"
          onClick={() => { if (isLanding) handleNavClick('hero') }}
        >
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-extrabold text-white">
            P
          </span>
          <span>PRGenie</span>
        </Link>

        {/* Desktop Nav Links (landing only) */}
        {isLanding && (
          <ul className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.target}>
                <button
                  onClick={() => handleNavClick(item.target)}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    activeSection === item.target
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {item.label}
                  {activeSection === item.target && (
                    <motion.div
                      layoutId="activeSection"
                      className="absolute inset-0 bg-white/5 rounded-lg border border-white/10"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link
                to="/dashboard"
                className="hidden lg:inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-white/5"
              >
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
              <Link
                to="/analyze"
                className="btn-primary py-2 px-4 text-xs lg:text-sm"
              >
                <GitBranch size={14} />
                Go to Repo
              </Link>
              <button
                onClick={handleLogout}
                className="hidden lg:inline-flex items-center gap-2 text-sm text-gray-400 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/5"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              {isLanding && (
                <Link to="/login" className="hidden lg:block text-sm text-gray-400 hover:text-white transition-colors px-3 py-2">
                  Sign In
                </Link>
              )}
              <Link to="/login" className="btn-primary py-2 px-4 text-xs lg:text-sm">
                Get Started Free
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            className="lg:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <span className={`w-5 h-0.5 bg-white rounded transition-all ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`w-5 h-0.5 bg-white rounded transition-all ${mobileOpen ? 'opacity-0' : ''}`}></span>
            <span className={`w-5 h-0.5 bg-white rounded transition-all ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatedMobileMenu
        isOpen={mobileOpen}
        isLanding={isLanding}
        isAuthenticated={isAuthenticated}
        activeSection={activeSection}
        onNavClick={handleNavClick}
        onLogout={handleLogout}
        onClose={() => setMobileOpen(false)}
      />
    </motion.nav>
  )
}

function AnimatedMobileMenu({ isOpen, isLanding, isAuthenticated, activeSection, onNavClick, onLogout, onClose }) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute top-16 left-0 right-0 bg-[#0f0f17] border-b border-white/10 p-6 flex flex-col gap-2 lg:hidden"
    >
      {isLanding && navItems.map((item) => (
        <button
          key={item.target}
          onClick={() => onNavClick(item.target)}
          className={`text-left px-4 py-3 text-sm rounded-lg transition-colors ${
            activeSection === item.target ? 'text-white bg-white/5' : 'text-gray-400 hover:text-white'
          }`}
        >
          {item.label}
        </button>
      ))}

      {isAuthenticated && (
        <>
          <Link to="/dashboard" onClick={onClose} className="px-4 py-3 text-sm text-gray-400 hover:text-white rounded-lg transition-colors flex items-center gap-2">
            <LayoutDashboard size={16} /> Dashboard
          </Link>
          <Link to="/analyze" onClick={onClose} className="px-4 py-3 text-sm text-gray-400 hover:text-white rounded-lg transition-colors flex items-center gap-2">
            <GitBranch size={16} /> Go to Repo
          </Link>
          <button onClick={onLogout} className="text-left px-4 py-3 text-sm text-red-400 hover:text-red-300 rounded-lg transition-colors flex items-center gap-2">
            <LogOut size={16} /> Logout
          </button>
        </>
      )}

      {!isAuthenticated && (
        <Link to="/login" onClick={onClose} className="px-4 py-3 text-sm text-gray-400 hover:text-white rounded-lg transition-colors">
          Sign In
        </Link>
      )}
    </motion.div>
  )
}

export default Navbar
