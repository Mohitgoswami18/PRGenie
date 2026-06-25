import { Github, Triangle, CreditCard } from 'lucide-react'
import { motion } from 'framer-motion'

const testimonials = [
  {
    stars: 5,
    quote:
      '"PRGenie reduced our PR review turnaround from 24 hours to 15 minutes. It\'s like having a Senior Dev on call 24/7."',
    name: 'Sarah Jenkins',
    role: 'Lead Engineer at CloudBase',
    initials: 'SJ',
  },
  {
    stars: 5,
    quote:
      '"The security analysis alone is worth the price. It caught a major credential leak that our manual process missed."',
    name: 'Marcus Chen',
    role: 'CTO at FinnoAI',
    initials: 'MC',
  },
  {
    stars: 5,
    quote:
      '"Clean code is no longer a debate. PRGenie enforces our standards automatically, letting humans focus on architecture."',
    name: 'Elena Rodriguez',
    role: 'Sr. Developer at Sparky',
    initials: 'ER',
  },
]

const companies = [
  { name: 'GitHub', icon: <Github size={18} /> },
  { name: 'Vercel', icon: <Triangle size={18} /> },
  { name: 'Stripe', icon: <CreditCard size={18} /> },
]

function Testimonials() {
  return (
    <section className="py-20 bg-background relative" id="testimonials">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight mb-2">Loved by Teams at Scale</h2>
            <p className="text-sm text-gray-400">Trusted by developers at the world's most innovative companies.</p>
          </div>

          <div className="flex items-center justify-start lg:justify-end gap-6">
            {companies.map((company, i) => (
              <span className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-400 transition-colors" key={i}>
                {company.icon}
                {company.name}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="glass-card p-6 flex flex-col gap-5 group" 
              key={i}
            >
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <span className="text-[#f59e0b] text-sm" key={j}>★</span>
                ))}
              </div>
              <p className="text-sm text-gray-400 leading-relaxed italic flex-1">{t.quote}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-bold text-sm text-white shrink-0">
                  {t.initials}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-white group-hover:text-primary transition-colors">{t.name}</span>
                  <span className="text-xs text-gray-500">{t.role}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials
