import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getReviewById } from '../services/api'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ArrowLeft, GitMerge, Github, Loader2, Bug, ShieldAlert, CheckCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion } from 'framer-motion'

function ReviewDetail() {
  const { id } = useParams()
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchReview() {
      try {
        setLoading(true)
        const data = await getReviewById(id)
        setReview(data)
      } catch (err) {
        setError(err.message || 'Failed to load review details')
      } finally {
        setLoading(false)
      }
    }
    
    fetchReview()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] pt-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (error || !review) {
    return (
      <div className="min-h-[calc(100vh-64px)] pt-32 px-6 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Review Not Found</h2>
        <p className="text-gray-400 mb-8">{error || 'The requested PR review could not be found.'}</p>
        <Link to="/dashboard" className="btn-primary">
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-12 min-h-[calc(100vh-64px)] px-6">
      <div className="container mx-auto max-w-4xl">
        
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft size={16} /> Back to Overview
        </Link>
        
        {/* Header Card */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="glass-card p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold ${
                  review.status === 'complete' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                  'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                }`}>
                  {review.status.toUpperCase()}
                </span>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(parseISO(review.created_at), { addSuffix: true })}
                </span>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold">{review.pr_title}</h1>
              
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Github size={16} />
                  <span>{review.repo_full_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <GitMerge size={16} />
                  <span>#{review.pr_number}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[10px] text-white font-bold">
                    {review.pr_author.charAt(0).toUpperCase()}
                  </div>
                  <span>{review.pr_author}</span>
                </div>
              </div>
            </div>
            
            <a 
              href={review.pr_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#16161f] border border-white/10 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors shrink-0"
            >
              <Github size={16} /> View on GitHub
            </a>
          </div>
          
          <div className="flex items-center gap-6 mt-8 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2">
              <Bug className={review.bugs_found > 0 ? "text-red-400" : "text-green-400"} size={18} />
              <span className="text-sm">
                <strong className={review.bugs_found > 0 ? "text-red-400" : "text-green-400"}>{review.bugs_found}</strong> Bugs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldAlert className={review.security_issues > 0 ? "text-orange-400" : "text-green-400"} size={18} />
              <span className="text-sm">
                <strong className={review.security_issues > 0 ? "text-orange-400" : "text-green-400"}>{review.security_issues}</strong> Security Issues
              </span>
            </div>
            {review.bugs_found === 0 && review.security_issues === 0 && (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle size={18} />
                <span className="text-sm">All clear</span>
              </div>
            )}
          </div>
        </motion.div>
        
        {/* Markdown Review Content */}
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.1}}>
          <h2 className="text-xl font-bold mb-4 px-2">AI Review Analysis</h2>
          <div className="glass-card p-6 md:p-10 prose prose-invert prose-purple max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-8 first:prose-h2:mt-0 prose-h3:text-xl prose-p:text-gray-300 prose-li:text-gray-300 prose-a:text-primary hover:prose-a:text-purple-400 prose-strong:text-white prose-code:text-purple-300 prose-code:bg-purple-900/20 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
            <ReactMarkdown>
              {review.review_text}
            </ReactMarkdown>
          </div>
        </motion.div>
        
      </div>
    </div>
  )
}

export default ReviewDetail
