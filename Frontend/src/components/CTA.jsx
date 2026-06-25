import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

function CTA() {
  return (
    <section className="py-24 relative overflow-hidden" id="cta">
      <div className="container mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative bg-gradient-to-br from-[#1e1046] via-[#2d1a6e] to-[#4c1d95] rounded-3xl p-12 md:p-20 text-center overflow-hidden border border-primary/20"
        >
          {/* Glow behind CTA */}
          <div className="absolute -top-[50%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse,rgba(139,92,246,0.2)_0%,transparent_70%)] pointer-events-none"></div>
          <div className="absolute -bottom-[50%] left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[radial-gradient(ellipse,rgba(168,85,247,0.12)_0%,transparent_70%)] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center gap-6">
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight tracking-tight max-w-xl">
              Ready to Automate Your Code Quality?
            </h2>
            <p className="text-base text-gray-300 max-w-md leading-relaxed">
              Join 10,000+ developers shipping cleaner code faster. Start your
              14-day free trial today.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
              <Link to="/dashboard" className="btn-primary w-full sm:w-auto">
                Get Started for Free
              </Link>
              <a href="#demo" className="px-8 py-3 bg-transparent text-gray-300 hover:text-white font-medium text-sm underline underline-offset-4 decoration-gray-500 hover:decoration-gray-300 transition-all w-full sm:w-auto">
                Schedule Demo
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default CTA
