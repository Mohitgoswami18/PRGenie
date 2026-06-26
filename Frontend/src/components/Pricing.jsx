import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'Perfect for individual developers exploring AI code review.',
    features: [
      '5 AI reviews per month',
      'Public repositories only',
      'Basic bug detection',
      'Community support',
      'Standard response time',
    ],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'For developers and small teams who need unlimited power.',
    features: [
      'Unlimited AI reviews',
      'Public & private repos',
      'Advanced security analysis',
      'Performance profiling',
      'Priority support',
      'Dashboard analytics',
      'Custom review rules',
    ],
    cta: 'Start 14-Day Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '$79',
    period: '/month',
    description: 'For teams that need advanced controls and dedicated support.',
    features: [
      'Everything in Pro',
      'Unlimited team members',
      'SSO & SAML auth',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom AI model tuning',
      'On-premise deployment',
      'Audit logs & compliance',
    ],
    cta: 'Contact Sales',
    highlight: false,
  },
]

function Pricing() {
  return (
    <section className="py-24 bg-background relative" id="pricing">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4"
          >
            Simple, transparent pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-gray-400 max-w-xl mx-auto"
          >
            Choose the plan that fits your workflow. Upgrade or downgrade anytime.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative flex flex-col rounded-2xl p-8 border transition-all duration-300 ${
                plan.highlight
                  ? 'bg-gradient-to-b from-primary/10 to-card border-primary/30 shadow-[0_0_40px_rgba(124,58,237,0.15)] scale-[1.02]'
                  : 'glass-card'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-primary to-secondary rounded-full text-xs font-bold text-white shadow-lg">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-gray-400">{plan.period}</span>}
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{plan.description}</p>
              </div>

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-gray-300">
                    <Check size={16} className={plan.highlight ? 'text-primary' : 'text-emerald-500'} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                to="/login"
                className={`w-full py-3 rounded-lg text-center text-sm font-semibold transition-all duration-200 ${
                  plan.highlight
                    ? 'btn-primary'
                    : 'bg-[#16161f] border border-white/10 text-white hover:bg-white/5 hover:border-primary/30'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Pricing
