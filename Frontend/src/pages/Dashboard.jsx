import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getReviews, getStats, deleteReview } from '../services/api'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Activity, Bug, GitMerge, ShieldAlert, Loader2, ArrowUpRight, Search, FileText, Trash2 } from 'lucide-react'
import { motion } from 'framer-motion'

function Dashboard() {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  async function refreshData() {
    try {
      const [reviewsData, statsData] = await Promise.all([
        getReviews(),
        getStats()
      ])
      setReviews(reviewsData.reviews || [])
      setStats(statsData)
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    }
  }

  useEffect(() => {
    refreshData().finally(() => {
      setLoading(false)
    })
  }, [])

  // Poll dashboard data if there are any pending reviews
  useEffect(() => {
    const hasPending = reviews.some(r => r.status === 'pending')
    if (!hasPending) return

    const interval = setInterval(() => {
      refreshData()
    }, 3000)

    return () => clearInterval(interval)
  }, [reviews])

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review report?")) return
    try {
      await deleteReview(id)
      await refreshData()
    } catch (error) {
      alert("Failed to delete review: " + error.message)
    }
  }

  const filteredReviews = reviews.filter(r => 
    r.pr_title.toLowerCase().includes(search.toLowerCase()) || 
    r.repo_full_name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] pt-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="pt-24 pb-12 min-h-[calc(100vh-64px)] px-6">
      <div className="container mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Overview</h1>
            <p className="text-gray-400 text-sm">Welcome back. Here's a summary of your recent AI PR reviews.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex items-center bg-[#16161f] border border-white/10 rounded-lg px-3 py-2 w-full md:w-64 focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/40 transition-all">
              <Search size={16} className="text-gray-500 mr-2" />
              <input 
                type="text" 
                placeholder="Search PRs..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm text-gray-300 w-full"
              />
            </div>
            <Link 
              to="/analyze" 
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all whitespace-nowrap"
            >
              Analyze New PR
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:0.1}} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <FileText size={16} />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Total Reviews</h3>
            </div>
            <div className="text-2xl font-bold">{stats?.total_reviews || 0}</div>
          </motion.div>
          
          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:0.2}} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-md bg-red-500/10 text-red-500 flex items-center justify-center">
                <Bug size={16} />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Bugs Caught</h3>
            </div>
            <div className="text-2xl font-bold">{stats?.bugs_caught || 0}</div>
          </motion.div>

          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:0.3}} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-md bg-orange-500/10 text-orange-500 flex items-center justify-center">
                <ShieldAlert size={16} />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Security Issues</h3>
            </div>
            <div className="text-2xl font-bold">{stats?.security_issues_prevented || 0}</div>
          </motion.div>

          <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:0.4}} className="glass-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-md bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Activity size={16} />
              </div>
              <h3 className="text-sm font-medium text-gray-400">Avg Review Time</h3>
            </div>
            <div className="text-2xl font-bold">{stats?.avg_review_time || '0.0s'}</div>
          </motion.div>
        </div>

        {/* Recent Reviews Table */}
        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay:0.5}} className="glass-card overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-lg font-semibold">Recent PR Reviews</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#16161f] text-gray-400 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 font-medium">Repository / PR</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Issues Found</th>
                  <th className="px-6 py-3 font-medium">Time</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredReviews.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No reviews found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredReviews.map((review) => (
                    <tr key={review.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <GitMerge size={14} className="text-purple-400" />
                            <a href={review.pr_url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary transition-colors">
                              {review.repo_full_name}#{review.pr_number}
                            </a>
                          </div>
                          <span className="text-gray-400 text-xs">{review.pr_title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          review.status === 'complete' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                          review.status === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                          'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}>
                          {review.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 text-xs">
                          {review.bugs_found > 0 && (
                            <span className="flex items-center gap-1 text-red-400" title="Bugs">
                              <Bug size={12} /> {review.bugs_found}
                            </span>
                          )}
                          {review.security_issues > 0 && (
                            <span className="flex items-center gap-1 text-orange-400" title="Security Issues">
                              <ShieldAlert size={12} /> {review.security_issues}
                            </span>
                          )}
                          {review.bugs_found === 0 && review.security_issues === 0 && (
                            <span className="text-gray-500">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {formatDistanceToNow(parseISO(review.created_at), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          <Link 
                            to={`/review/${review.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-purple-400 transition-colors"
                          >
                            View Report <ArrowUpRight size={14} />
                          </Link>
                          <button
                            onClick={() => handleDelete(review.id)}
                            className="text-gray-500 hover:text-red-400 transition-colors p-1"
                            title="Delete Review"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
        
      </div>
    </div>
  )
}

export default Dashboard
