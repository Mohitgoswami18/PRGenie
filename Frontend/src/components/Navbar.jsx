import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const [userEmail, setUserEmail] = useState(null)
  
  useEffect(() => {
    const email = localStorage.getItem('user_email');
    if (email) {
      setUserEmail(email);
    } else {
      setUserEmail(null);
    }
  }, [location])

  const isDashboard = location.pathname.includes('/dashboard') || location.pathname.includes('/review')

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#09090f]/85 backdrop-blur-md border-b border-white/10 flex items-center">
      <div className="container mx-auto px-6 flex items-center justify-between w-full">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-white">
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm font-extrabold text-white">
            P
          </span>
          <span>PRGenie</span>
        </Link>

        {!isDashboard && (
          <ul className={`lg:flex items-center gap-8 ${mobileOpen ? 'flex flex-col absolute top-16 left-0 right-0 bg-[#0f0f17] border-b border-white/10 p-6' : 'hidden'}`}>
            <li><a href="/#features" className="text-sm text-gray-400 hover:text-white transition-colors" onClick={() => setMobileOpen(false)}>Features</a></li>
            <li><a href="/#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors" onClick={() => setMobileOpen(false)}>How it Works</a></li>
            <li><a href="/#pricing" className="text-sm text-gray-400 hover:text-white transition-colors" onClick={() => setMobileOpen(false)}>Pricing</a></li>
            <li><a href="/#docs" className="text-sm text-gray-400 hover:text-white transition-colors" onClick={() => setMobileOpen(false)}>Documentation</a></li>
          </ul>
        )}

        <div className="flex items-center gap-4">
          {userEmail ? (
            <>
              <span className="hidden lg:inline text-xs text-gray-400">
                {userEmail}
              </span>
              <button 
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user_email');
                  setUserEmail(null);
                  window.location.href = '/';
                }}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {!isDashboard && (
                <Link to="/login" className="hidden lg:block text-sm text-gray-400 hover:text-white transition-colors">
                  Sign In
                </Link>
              )}
              <Link to="/dashboard" className="btn-primary py-2 px-4 text-xs lg:text-sm">
                {isDashboard ? 'Go to Repo' : 'Get Started Free'}
              </Link>
            </>
          )}
          
          {!isDashboard && (
            <button 
              className="lg:hidden flex flex-col gap-1.5 p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <span className={`w-5 h-0.5 bg-white rounded transition-all ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`w-5 h-0.5 bg-white rounded transition-all ${mobileOpen ? 'opacity-0' : ''}`}></span>
              <span className={`w-5 h-0.5 bg-white rounded transition-all ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar
