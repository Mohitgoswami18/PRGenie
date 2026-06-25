import { Cpu } from 'lucide-react'
import { motion } from 'framer-motion'

function ReviewFeature() {
  const features = [
    'Context-aware code suggestions',
    'Syntax and style enforcement',
    'Complexity analysis and refactoring tips',
    'Direct integration with GitHub Actions',
  ]

  return (
    <section className="py-20 bg-[#0f0f17] relative overflow-hidden" id="review-feature">
      <div className="container mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* Left content */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col gap-6"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight">
            Reviewing code shouldn't<br />take hours.
          </h2>

          <p className="text-base text-gray-400 leading-relaxed max-w-md">
            Our neural engine parses your diffs, understands the context of your
            existing codebase, and provides actionable feedback just like a senior
            engineer would—only faster.
          </p>

          <ul className="flex flex-col gap-4 mt-4">
            {features.map((item, i) => (
              <li className="flex items-center gap-3 text-sm text-gray-400" key={i}>
                <span className="w-2 h-2 rounded-full bg-primary shrink-0 shadow-[0_0_8px_rgba(139,92,246,0.5)]"></span>
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Right visual */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col items-center gap-8"
        >
          <div className="w-[220px] h-[220px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.15)_0%,rgba(124,58,237,0.05)_50%,transparent_70%)] border border-primary/20 flex items-center justify-center relative animate-[pulse-glow_4s_ease-in-out_infinite] shadow-[0_0_40px_rgba(139,92,246,0.2)]">
            <div className="absolute inset-4 rounded-full border border-primary/15"></div>
            <div className="absolute inset-9 rounded-full border border-primary/10"></div>
            
            <div className="w-20 h-20 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-purple-400 relative z-10">
              <Cpu size={36} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 w-full max-w-[380px]">
            <div className="flex-1 glass-card p-5 text-center">
              <div className="text-3xl font-extrabold text-white mb-1">
                0.4<span className="text-purple-400">s</span>
              </div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Analysis Speed</div>
            </div>
            <div className="flex-1 glass-card p-5 text-center">
              <div className="text-3xl font-extrabold text-white mb-1">
                99.2<span className="text-purple-400">%</span>
              </div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Accuracy</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default ReviewFeature
