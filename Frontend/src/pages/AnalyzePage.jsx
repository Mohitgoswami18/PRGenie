import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { analyzePr, pollReviewStatus } from '../services/api'
import { Loader2, ArrowRight, CheckCircle, XCircle, ArrowLeft, Sparkles, Shield, BookOpen, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const MODES = [
  {
    value: 'balanced',
    label: 'Balanced',
    icon: <Zap size={16} />,
    description: 'Practical review — focuses on real-world impact.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    activeBg: 'bg-purple-500/20 border-purple-500/40 ring-2 ring-purple-500/20',
  },
  {
    value: 'strict',
    label: 'Strict',
    icon: <Shield size={16} />,
    description: 'Zero-tolerance — flags every potential issue.',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    activeBg: 'bg-red-500/20 border-red-500/40 ring-2 ring-red-500/20',
  },
  {
    value: 'detailed',
    label: 'Detailed',
    icon: <BookOpen size={16} />,
    description: 'Educational — explains the "why" behind findings.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    activeBg: 'bg-blue-500/20 border-blue-500/40 ring-2 ring-blue-500/20',
  },
]

function AnalyzePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Form state
  const [prUrl, setPrUrl] = useState('')
  const [mode, setMode] = useState('balanced')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Polling state
  const [reviewId, setReviewId] = useState(null)
  const [status, setStatus] = useState(null) // 'pending' | 'complete' | 'error'
  const [reviewData, setReviewData] = useState(null)
  const [pollMsg, setPollMsg] = useState('')

  // If redirected from Hero with review_id
  useEffect(() => {
    const rid = searchParams.get('review_id')
    if (rid) {
      setReviewId(parseInt(rid))
      setStatus('pending')
      setPollMsg('Review queued. Waiting for AI analysis...')
    }
  }, [searchParams])

  // Poll when reviewId is set and status is pending
  useEffect(() => {
    if (!reviewId || status !== 'pending') return

    let cancelled = false

    pollReviewStatus(
      reviewId,
      (review) => {
        if (cancelled) return
        setReviewData(review)
        if (review.status === 'pending') {
          setPollMsg('AI is analyzing the PR diff...')
        }
      },
      2000,
      90
    )
      .then((review) => {
        if (cancelled) return
        setReviewData(review)
        setStatus(review.status)
        setPollMsg(review.status === 'complete' ? 'Review complete!' : 'Review finished with errors.')
      })
      .catch((err) => {
        if (cancelled) return
        setStatus('error')
        setPollMsg(err.message || 'Polling failed')
      })

    return () => { cancelled = true }
  }, [reviewId, status])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = prUrl.trim()
    if (!trimmed) return

    if (!trimmed.includes('github.com') || !trimmed.includes('/pull/')) {
      setError('Please enter a valid GitHub PR URL (e.g. https://github.com/owner/repo/pull/123)')
      return
    }

    setError('')
    setSubmitting(true)

    try {
      const result = await analyzePr(trimmed, mode)
      setReviewId(result.review_id)
      setStatus('pending')
      setPollMsg(result.message || 'Review queued. Waiting for AI analysis...')
    } catch (err) {
      setError(err.message || 'Failed to submit PR')
    } finally {
      setSubmitting(false)
    }
  }

  // ---------- Render: Polling / Result View ----------
  if (reviewId) {
    return (
      <div className="pt-24 pb-12 min-h-[calc(100vh-64px)] px-6">
        <div className="container mx-auto max-w-xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-10"
          >
            <AnimatePresence mode="wait">
              {status === 'pending' && (
                <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3">Analyzing PR...</h2>
                  <p className="text-gray-400 text-sm mb-6">{pollMsg}</p>

                  {/* Animated progress dots */}
                  <div className="flex justify-center gap-2 mb-6">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>

                  <div className="text-xs text-gray-600">Review ID: {reviewId}</div>
                </motion.div>
              )}

              {status === 'complete' && (
                <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3 text-green-400">Review Complete!</h2>
                  <p className="text-gray-400 text-sm mb-2">
                    {reviewData?.pr_title && <span className="text-white font-medium">{reviewData.pr_title}</span>}
                  </p>
                  {reviewData && (
                    <div className="flex justify-center gap-6 text-sm text-gray-400 mb-8 mt-4">
                      <span className="text-red-400 font-semibold">{reviewData.bugs_found} bugs</span>
                      <span className="text-orange-400 font-semibold">{reviewData.security_issues} security</span>
                    </div>
                  )}
                  <Link
                    to={`/review/${reviewId}`}
                    className="btn-primary"
                  >
                    View Full Report <ArrowRight size={14} />
                  </Link>
                </motion.div>
              )}

              {status === 'error' && (
                <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-3 text-red-400">Review Failed</h2>
                  <p className="text-gray-400 text-sm mb-8">{pollMsg}</p>
                  <button
                    onClick={() => { setReviewId(null); setStatus(null); setReviewData(null); setPollMsg('') }}
                    className="btn-primary"
                  >
                    <ArrowLeft size={14} /> Try Again
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    )
  }

  // ---------- Render: Submission Form ----------
  return (
    <div className="pt-24 pb-12 min-h-[calc(100vh-64px)] px-6">
      <div className="container mx-auto max-w-2xl">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>

          <h1 className="text-3xl font-bold mb-2">Analyze a Pull Request</h1>
          <p className="text-gray-400 text-sm mb-8">
            Paste a GitHub PR URL below and select a review mode. PRGenie will fetch the diff and generate an AI-powered review.
          </p>
        </motion.div>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* PR URL Input */}
          <div className="glass-card p-6">
            <label className="block text-sm font-medium mb-3">GitHub PR URL</label>
            <div className="flex items-center bg-[#16161f] border border-white/10 rounded-lg p-1.5 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <span className="text-gray-500 ml-3 mr-2 shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              </span>
              <input
                type="text"
                placeholder="https://github.com/owner/repo/pull/123"
                value={prUrl}
                onChange={(e) => { setPrUrl(e.target.value); setError('') }}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-300 py-2 min-w-0"
                disabled={submitting}
              />
            </div>
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </div>

          {/* Mode Selection */}
          <div className="glass-card p-6">
            <label className="block text-sm font-medium mb-4">
              <Sparkles size={14} className="inline mr-2 text-purple-400" />
              Review Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`p-4 rounded-lg border text-left transition-all cursor-pointer ${
                    mode === m.value ? m.activeBg : m.bg
                  } hover:scale-[1.02]`}
                >
                  <div className={`flex items-center gap-2 mb-2 ${m.color} font-semibold text-sm`}>
                    {m.icon} {m.label}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{m.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !prUrl.trim()}
            className="btn-primary w-full justify-center py-4 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Start AI Review
              </>
            )}
          </button>
        </motion.form>
      </div>
    </div>
  )
}

export default AnalyzePage
