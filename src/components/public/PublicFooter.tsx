import { Link } from 'react-router-dom';
import { Building2, Phone } from 'lucide-react';

interface PublicFooterProps {
  tenantName?: string;
}

export function PublicFooter({ tenantName = 'Demo Credit Union' }: PublicFooterProps) {
  const year = new Date().getFullYear();

  const sections = [
    {
      title: 'Personal Banking',
      links: [
        { label: 'Free Checking', href: '/checking' },
        { label: 'Savings & CDs', href: '/savings' },
        { label: 'Credit Cards', href: '/credit-cards' },
        { label: 'Auto Loans', href: '/auto-loans' },
        { label: 'Mortgages', href: '/mortgages' },
        { label: 'Personal Loans', href: '/loans' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { label: 'Financial Wellness', href: '/learn' },
        { label: 'Calculators', href: '/calculators' },
        { label: 'Fraud Prevention', href: '/fraud-prevention' },
        { label: 'Current Rates', href: '/rates' },
        { label: 'Mobile App', href: '/p/mobile-app' },
        { label: 'Online Banking', href: '/auth' },
        { label: 'CO-OP ATMs', href: '/find-us' },
      ],
    },
    {
      title: 'Our Credit Union',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Community', href: '/community' },
        { label: 'Careers', href: '/careers' },
        { label: 'Scholarships', href: '/scholarships' },
        { label: 'Press Center', href: '/p/press' },
        { label: 'Feedback', href: '/p/feedback' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Contact Us', href: '/contact' },
        { label: 'FAQs', href: '/faqs' },
        { label: 'Find a Branch', href: '/find-us' },
        { label: 'Report Fraud', href: '/fraud-prevention' },
        { label: 'Lost/Stolen Card', href: '/contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/p/privacy' },
        { label: 'Terms of Service', href: '/p/terms' },
        { label: 'Cookie Policy', href: '/p/cookie-policy' },
        { label: 'Accessibility', href: '/p/accessibility' },
        { label: 'Disclosures', href: '/p/disclosures' },
        { label: 'NMLS Info', href: '/p/nmls' },
      ],
    },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* Contact bar */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-blue-400" />
              <span className="text-slate-400">Member Services:</span>
              <a href="tel:+18005559665" className="text-white font-semibold hover:text-blue-300 transition-colors">
                (800) 555-0199
              </a>
              <span className="text-slate-600 mx-2">|</span>
              <span className="text-slate-400">Routing #:</span>
              <span className="text-white font-mono">265473851</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>Mon-Fri 7am-7pm</span>
              <span className="text-slate-600">|</span>
              <span>Sat 9am-2pm EST</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main footer links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-6 w-6 text-blue-400" />
              <span className="text-lg font-semibold text-white">Demo CU</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              Serving the Delaware Valley community since 1952. Your savings federally insured to at least $250,000 by NCUA.
            </p>

            {/* Social links */}
            <div className="flex gap-3">
              {[
                { label: 'Facebook', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
                { label: 'Twitter', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
                { label: 'LinkedIn', path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
                { label: 'Instagram', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
                { label: 'YouTube', path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#"
                  className="text-slate-400 hover:text-white transition-colors"
                  aria-label={social.label}
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-white mb-3">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Regulatory footer */}
        <div className="mt-12 pt-8 border-t border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              &copy; {year} {tenantName}. All rights reserved.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-xs text-slate-500 font-semibold border border-slate-700 px-2 py-0.5 rounded">NCUA</span>
              <span className="text-xs text-slate-500">Equal Housing Lender</span>
              <span className="text-xs text-slate-500">Equal Opportunity Lender</span>
              <span className="text-xs text-slate-500">NMLS #123456</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Demo Credit Union is a not-for-profit financial cooperative. Your savings federally insured to at least $250,000 and backed by the full faith and credit of the United States Government. National Credit Union Administration (NCUA), a U.S. Government Agency. APY = Annual Percentage Yield. APR = Annual Percentage Rate. Rates are subject to change without notice and are effective as of March 14, 2026. All loans subject to credit approval. Membership eligibility required. This is a demo website for illustrative purposes only.
          </p>
        </div>
      </div>
    </footer>
  );
}
