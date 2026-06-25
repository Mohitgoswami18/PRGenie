import { Code2, Bug, GitMerge, LayoutDashboard } from 'lucide-react'
import { motion } from 'framer-motion'

const features = [
  {
    icon: <Code2 size={20} />,
    iconClass: 'bg-primary/10 text-purple-400 border-primary/20',
    title: 'AI Code Summary',
    description:
      'Get a plain-English explanation of exactly what changed in the PR. No more scrolling through diff files to understand intent.',
  },
  {
    icon: <Bug size={20} />,
    iconClass: 'bg-red-500/10 text-red-500 border-red-500/20',
    title: 'Bug Detection',
    description:
      'Instant identification of logical errors, security flaws, and edge cases. Real-time detection of SQL injections, vulnerabilities, and insecure dependencies.',
  },
  {
    icon: <GitMerge size={20} />,
    iconClass: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    title: 'Auto Merge',
    description:
      'Safely auto-merge PRs that meet your custom confidence thresholds. Set custom confidence thresholds. High-quality review flows can merge automatically.',
  },
  {
    icon: <LayoutDashboard size={20} />,
    iconClass: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    title: 'History Dashboard',
    description:
      'Track review KPIs and maintain a historical record of all AI audits. Visualize your team\'s code quality trends and bottleneck areas.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
}

function Features() {
  return (
    <section className="py-20 bg-background relative" id="features">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Everything you need to ship faster
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-base">
            Intelligent tools designed for high-performance engineering teams.
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6"
        >
          {features.map((feature, i) => (
            <motion.div variants={itemVariants} className="glass-card p-8 group relative overflow-hidden" key={i}>
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className={`w-11 h-11 rounded-md flex items-center justify-center mb-5 border ${feature.iconClass}`}>
                {feature.icon}
              </div>
              <h3 className="text-base font-bold mb-3 text-white">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default Features
