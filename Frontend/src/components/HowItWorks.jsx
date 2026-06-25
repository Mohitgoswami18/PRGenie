import { Globe, PlayCircle, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

const steps = [
  {
    number: '01',
    icon: <Globe size={18} />,
    title: 'Connect Repo',
    description:
      'Install our GitHub app and select the repositories you want AI PR Review to monitor.',
  },
  {
    number: '02',
    icon: <PlayCircle size={18} />,
    title: 'Open a PR',
    description:
      'As soon as a PR is opened, our AI begins analyzing the code diff and context.',
  },
  {
    number: '03',
    icon: <CheckCircle2 size={18} />,
    title: 'Get Review',
    description:
      'Receive a detailed code review with bug detection, security analysis, and improvement suggestions within seconds.',
  },
]

function HowItWorks() {
  return (
    <section className="py-24 bg-[#0f0f17] relative overflow-hidden" id="how-it-works">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">How it works</h2>
          <p className="text-gray-400">Ship with confidence in three simple steps.</p>
        </div>

        <div className="relative max-w-2xl mx-auto">
          {/* Vertical timeline line */}
          <div className="absolute left-6 md:left-1/2 md:-translate-x-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary/40 via-primary/15 to-primary/40"></div>

          {steps.map((step, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative flex items-center mb-20 last:mb-0 ${
                i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              } flex-row`} 
              key={i}
            >
              <span className={`hidden md:block absolute text-9xl font-black text-primary/[0.03] leading-none z-0 ${
                i % 2 === 0 ? 'left-0' : 'right-0'
              }`}>
                {step.number}
              </span>
              
              <div className={`md:w-1/2 w-auto md:text-${i % 2 === 0 ? 'right' : 'left'} text-left md:px-12 pl-16 pr-0 z-10`}>
                <h3 className="text-xl font-bold mb-2 text-white">{step.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
              </div>
              
              <div className="absolute left-6 md:left-1/2 -translate-x-1/2 z-20 w-[52px] h-[52px] rounded-full flex items-center justify-center border-2 border-primary/30 bg-[#0f0f17]">
                <div className="w-[38px] h-[38px] rounded-full bg-gradient-to-br from-primary to-purple-700 flex items-center justify-center text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                  {step.icon}
                </div>
              </div>
              
              <div className="hidden md:block w-1/2"></div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
