import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeRepo } from '../services/api'
import { showToast } from '../components/Toast'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Loader2, GitBranch, Globe, ArrowRight, Bug, ShieldAlert,
  Zap, CheckCircle, AlertTriangle, Info, ChevronDown, ChevronUp,
  BarChart3, BookOpen, ExternalLink
} from 'lucide-react'

function AnalyzeRepo() {
  const [repoUrl, setRepoUrl] = useState('')
  const [prUrl, setPrUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [expandedSections, setExpandedSections] = useState({})
  const navigate = useNavigate()

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const handleAnalyze = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)

    if (!repoUrl.trim()) {
      setError('Please enter a GitHub repository URL')
      return
    }

    if (!repoUrl.includes('github.com')) {
      setError('Please enter a valid GitHub URL')
      return
    }

    setLoading(true)

    try {
      const data = await analyzeRepo(repoUrl, prUrl)
      setResult(data.review)
      showToast('Analysis complete! 🎉')
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Analysis failed'
      setError(message)
      showToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityStyle = (severity) => {
    if (!severity) return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
    const s = severity.toLowerCase()
    if (s.includes('critical')) return 'bg-red-500/10 text-red-400 border-red-500/20'
    if (s.includes('warning')) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  }

  const getSeverityIcon = (severity) => {
    if (!severity) return <Info size={14} />
    const s = severity.toLowerCase()
    if (s.includes('critical')) return <AlertTriangle size={14} />
    if (s.includes('warning')) return <AlertTriangle size={14} />
    return <Info size={14} />
  }

  return (
    <div className="pt-24 pb-12 min-h-screen px-6">
      <div className="container mx-auto max-w-5xl">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-medium text-purple-300 mb-4">
            <Zap size={14} className="text-purple-400" />
            <span>Powered by Google Gemini AI</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            Repository <span className="gradient-text">Analysis</span>
          </h1>
          <p className="text-gray-400 max-w-lg mx-auto">
            Enter a GitHub repository or pull request URL for a comprehensive AI-powered code review.
          </p>
        </motion.div>

        {/* Input Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 md:p-8 mb-8"
        >
          <form onSubmit={handleAnalyze} className="flex flex-col gap-5">
            {/* Repository URL */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Globe size={16} className="text-primary" />
                Repository URL <span className="text-red-400">*</span>
              </label>
              <div className="flex items-center bg-[#16161f] border border-white/10 rounded-lg px-4 py-3 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <GitBranch size={16} className="text-gray-500 mr-3 shrink-0" />
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/owner/repository"
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-300 min-w-0"
                  disabled={loading}
                />
              </div>
            </div>

            {/* PR URL (Optional) */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <GitBranch size={16} className="text-blue-400" />
                Pull Request URL <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <div className="flex items-center bg-[#16161f] border border-white/10 rounded-lg px-4 py-3 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                <Search size={16} className="text-gray-500 mr-3 shrink-0" />
                <input
                  type="text"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo/pull/123"
                  className="flex-1 bg-transparent border-none outline-none text-sm text-gray-300 min-w-0"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5"
              >
                {error}
              </motion.p>
            )}

            {/* Analyze Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary py-3.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto md:self-end md:px-10"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  Analyze Repository
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Loading Animation */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass-card p-12 mb-8 text-center"
            >
              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="w-20 h-20 rounded-full border-2 border-primary/20 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full border-2 border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin"></div>
                </div>
                <div className="absolute inset-0 w-20 h-20 rounded-full bg-primary/5 animate-ping"></div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Analyzing Repository...</h3>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                PRGenie is fetching code from GitHub and running AI analysis. This may take 15-30 seconds depending on the repository size.
              </p>
              <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-500">
                <span className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-500" /> Fetching code</span>
                <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin text-primary" /> AI analysis</span>
                <span className="flex items-center gap-2 text-gray-600"><BarChart3 size={14} /> Generating report</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Score Card */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5 text-center">
                  <div className={`text-3xl font-extrabold mb-1 ${
                    result.score >= 80 ? 'text-emerald-400' : result.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {result.score}<span className="text-lg">/100</span>
                  </div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">AI Score</div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5 text-center">
                  <div className="flex items-center justify-center gap-2 text-xl font-bold text-red-400 mb-1">
                    <Bug size={20} /> {result.bugs_found}
                  </div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Bugs Found</div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5 text-center">
                  <div className="flex items-center justify-center gap-2 text-xl font-bold text-orange-400 mb-1">
                    <ShieldAlert size={20} /> {result.security_issues}
                  </div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Security Issues</div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-5 text-center">
                  <div className="flex items-center justify-center gap-2 text-xl font-bold text-primary mb-1">
                    <BookOpen size={20} /> {result.repo_full_name}
                  </div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Repository</div>
                </motion.div>
              </div>

              {/* Review Content */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <div className="flex items-center justify-between mb-4 px-1">
                  <h2 className="text-xl font-bold">AI Review Report</h2>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="text-sm text-primary hover:text-purple-400 transition-colors flex items-center gap-1"
                  >
                    View in Dashboard <ExternalLink size={14} />
                  </button>
                </div>

                <div className="glass-card p-6 md:p-10 prose prose-invert prose-purple max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h1:mb-6 prose-h2:text-xl prose-h2:mb-4 prose-h2:mt-8 first:prose-h2:mt-0 prose-h3:text-lg prose-p:text-gray-300 prose-li:text-gray-300 prose-a:text-primary hover:prose-a:text-purple-400 prose-strong:text-white prose-code:text-purple-300 prose-code:bg-purple-900/20 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#0d0d14] prose-pre:border prose-pre:border-white/10 prose-pre:rounded-xl">
                  <ReactMarkdown>{result.review_text}</ReactMarkdown>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!loading && !result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-gray-500 py-12"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <Search size={24} className="text-primary" />
            </div>
            <p className="text-sm">Enter a GitHub repository URL above to start analyzing</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default AnalyzeRepo
