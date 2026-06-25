import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import LandingPage from './pages/LandingPage'
import Dashboard from './pages/Dashboard'
import ReviewDetail from './pages/ReviewDetail'

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-white font-sans overflow-x-hidden">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/review/:id" element={<ReviewDetail />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
