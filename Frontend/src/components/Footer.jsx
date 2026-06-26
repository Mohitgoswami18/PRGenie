import { Twitter, Github, Linkedin } from 'lucide-react'

const productLinks = ['Features', 'Integrations', 'Pricing', 'Changelog']
const companyLinks = ['About Us', 'Careers', 'Security', 'Privacy']
const supportLinks = ['Help Center', 'Blog', 'API Status', 'Community']

function Footer() {
  return (
    <footer className="bg-[#0f0f17] border-t border-white/10 pt-16 pb-8" id="about-us">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-xs font-extrabold text-white">P</span>
              <span>PRGenie</span>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-[280px]">
              Automating the world's code reviews with
              secure, context-aware AI. Built by
              developers, for developers.
            </p>
            <div className="flex gap-3 mt-2">
              <a href="#twitter" className="w-9 h-9 rounded-md bg-[#111118] border border-white/10 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary/30 hover:bg-primary/10 transition-all">
                <Twitter size={16} />
              </a>
              <a href="#github" className="w-9 h-9 rounded-md bg-[#111118] border border-white/10 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary/30 hover:bg-primary/10 transition-all">
                <Github size={16} />
              </a>
              <a href="#linkedin" className="w-9 h-9 rounded-md bg-[#111118] border border-white/10 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary/30 hover:bg-primary/10 transition-all">
                <Linkedin size={16} />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="flex flex-col">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-primary mb-5">Product</h4>
            <ul className="flex flex-col gap-3">
              {productLinks.map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase().replace(' ', '-')}`} className="text-sm text-gray-500 hover:text-white transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="flex flex-col">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-primary mb-5">Company</h4>
            <ul className="flex flex-col gap-3">
              {companyLinks.map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase().replace(' ', '-')}`} className="text-sm text-gray-500 hover:text-white transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="flex flex-col">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-primary mb-5">Support</h4>
            <ul className="flex flex-col gap-3">
              {supportLinks.map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase().replace(' ', '-')}`} className="text-sm text-gray-500 hover:text-white transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10 gap-4">
          <p className="text-xs text-gray-600">
            © 2026 PRGenie Inc. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#terms" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Terms of Service</a>
            <a href="#privacy" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Privacy Policy</a>
            <a href="#cookies" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
