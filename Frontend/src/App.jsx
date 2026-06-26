import { Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Toast from './components/Toast'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import ReviewDetail from './pages/ReviewDetail'
import Login from './pages/Login'
import AnalyzeRepo from './pages/AnalyzeRepo'

function App() {
  const location = useLocation()
  
  // Hide footer on dashboard, review, analyze, and login pages
  const hideFooter = location.pathname.includes('/dashboard') || 
                     location.pathname.includes('/review') || 
                     location.pathname.includes('/analyze') ||
                     location.pathname.includes('/login')

  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-background text-white font-sans overflow-x-hidden">
        <Navbar />
        <Toast />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/review/:id" element={<ProtectedRoute><ReviewDetail /></ProtectedRoute>} />
            <Route path="/analyze" element={<ProtectedRoute><AnalyzeRepo /></ProtectedRoute>} />
          </Routes>
        </main>
        {!hideFooter && <Footer />}
      </div>
    </AuthProvider>
  )
}

export default App
