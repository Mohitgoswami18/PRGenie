import { Link } from 'react-router-dom'
import { Sparkles, ArrowRight, CreditCard, Clock, ShieldCheck, CheckCircle, GitBranch } from 'lucide-react'
import { motion } from 'framer-motion'

function Hero() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-32 pb-16 overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse,rgba(124,58,237,0.12)_0%,transparent_70%)] pointer-events-none z-0"></div>

      <div className="container mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left Content */}
        <div className="flex flex-col gap-6 lg:items-start items-center text-center lg:text-left">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-medium text-purple-300"
          >
            <Sparkles size={14} className="text-purple-400" />
            <span>Next Gemini Powered Analysis</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight"
          >
            AI-Powered<br />
            <span className="gradient-text">PR Reviews</span><br />
            in Seconds.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-gray-400 max-w-lg leading-relaxed"
          >
            Stop waiting for peer reviews. Automate code quality, find
            critical bugs, and optimize performance before your coffee
            gets cold.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center bg-[#16161f] border border-white/10 rounded-lg p-1.5 max-w-md w-full focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all"
          >
            <span className="text-gray-500 ml-3 mr-2 shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            </span>
            <input
              type="text"
              placeholder="Paste GitHub PR link..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-300 py-2 min-w-0"
            />
            <Link to="/analyze" className="btn-primary shrink-0">
              Analyze PR
              <ArrowRight size={14} />
            </Link>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-gray-500"
          >
            <span className="flex items-center gap-2">
              <CreditCard size={14} />
              No Credit Card
            </span>
            <span className="flex items-center gap-2">
              <Clock size={14} />
              Setup in 2 mins
            </span>
            <span className="flex items-center gap-2">
              <ShieldCheck size={14} />
              SOC2 Compliant
            </span>
          </motion.div>
        </div>

        {/* Right Visual */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative flex justify-center items-center lg:order-last order-first"
        >
          <div className="glass-card w-full max-w-[420px] p-6 relative">
            <div className="flex gap-1.5 mb-4">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
            </div>
            <div className="font-mono text-xs leading-loose text-gray-400">
              <div><span className="text-purple-400">function</span> <span className="text-blue-400">validateUser</span>(user) {'{'}</div>
              <div>&nbsp;&nbsp;<span className="text-purple-400">if</span> (user.role === <span className="text-emerald-400">'admin'</span>) {'{'}</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">return</span> <span className="text-blue-400">grantAccess</span>(user);</div>
              <div>&nbsp;&nbsp;{'}'}</div>
              <div>&nbsp;&nbsp;<span className="text-gray-500">{'// TODO: handle edge cases'}</span></div>
              <div>&nbsp;&nbsp;<span className="text-purple-400">if</span> (user.age &gt; <span className="text-orange-400">18</span>) {'{'}</div>
              <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">return true</span>;</div>
              <div>&nbsp;&nbsp;{'}'}</div>
              <div>{'}'}</div>
            </div>
          </div>

          {/* Floating elements */}
          <motion.div 
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-4 -right-4 w-12 h-12 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary"
          >
            <CheckCircle size={20} />
          </motion.div>
          
          <motion.div 
            animate={{ y: [-8, 8, -8] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-[30%] -right-8 w-11 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500"
          >
            <GitBranch size={18} />
          </motion.div>
          
          <motion.div 
            animate={{ y: [-12, 12, -12] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute -bottom-3 left-5 px-3 py-2 bg-card border border-white/10 rounded-lg shadow-xl text-[11px] font-mono text-emerald-500"
          >
            <div>
              <div className="flex gap-1.5"><span className="text-emerald-500">+</span> const db = connect()</div>
              <div className="flex gap-1.5"><span className="text-emerald-500">+</span> if (user.age &gt; 18) {'{}'}</div>
              <div className="flex gap-1.5"><span className="text-red-500">−</span> await db.close()</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default Hero
