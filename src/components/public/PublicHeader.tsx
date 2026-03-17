import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, ChevronDown, Menu, X } from 'lucide-react';

interface PublicHeaderProps {
  tenantName?: string;
  logoUrl?: string;
  primaryColor?: string;
}

interface NavDropdown {
  label: string;
  items: { label: string; href: string; description?: string }[];
}

const dropdowns: NavDropdown[] = [
  {
    label: 'Products',
    items: [
      { label: 'Free Checking', href: '/checking', description: 'No fees, no minimums' },
      { label: 'Savings & CDs', href: '/savings', description: 'Earn up to 5.00% APY' },
      { label: 'Credit Cards', href: '/credit-cards', description: 'Cash back & rewards' },
      { label: 'Auto Loans', href: '/auto-loans', description: 'Rates from 5.24% APR' },
      { label: 'Mortgages', href: '/mortgages', description: 'Purchase & refinance' },
      { label: 'Personal Loans', href: '/loans', description: 'Borrow up to $50K' },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Financial Wellness', href: '/learn', description: 'Articles & guides' },
      { label: 'Calculators', href: '/calculators', description: 'Plan your finances' },
      { label: 'Fraud Prevention', href: '/fraud-prevention', description: 'Stay safe online' },
      { label: 'Rates', href: '/rates', description: 'Current rates & APYs' },
      { label: 'FAQs', href: '/faqs', description: 'Common questions' },
    ],
  },
  {
    label: 'Our Credit Union',
    items: [
      { label: 'About Us', href: '/about', description: 'Serving since 1952' },
      { label: 'Community', href: '/community', description: '$2.5M+ annual giving' },
      { label: 'Careers', href: '/careers', description: 'Join our team of 850+' },
      { label: 'Scholarships', href: '/scholarships', description: '$250K awarded annually' },
      { label: 'Contact Us', href: '/contact', description: 'Get in touch' },
    ],
  },
];

export function PublicHeader({ tenantName = 'Demo CU', logoUrl, primaryColor }: PublicHeaderProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/home" className="flex items-center gap-2 shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={tenantName} className="h-8 w-auto" />
            ) : (
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: primaryColor ?? '#1e40af' }}
              >
                <Building2 className="h-5 w-5 text-white" />
              </div>
            )}
            <span className="text-lg font-semibold text-slate-900 hidden sm:inline">{tenantName}</span>
          </Link>

          {/* Desktop Nav — Dropdowns */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {dropdowns.map((dropdown) => (
              <div
                key={dropdown.label}
                className="relative"
                onMouseEnter={() => setOpenDropdown(dropdown.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-50"
                  onClick={() => setOpenDropdown(openDropdown === dropdown.label ? null : dropdown.label)}
                  aria-expanded={openDropdown === dropdown.label}
                  aria-haspopup="true"
                >
                  {dropdown.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDropdown === dropdown.label ? 'rotate-180' : ''}`} />
                </button>

                {openDropdown === dropdown.label && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-lg shadow-lg border p-2 z-50">
                    {dropdown.items.map((item) => (
                      <Link
                        key={item.href}
                        to={item.href}
                        className="flex flex-col px-3 py-2.5 rounded-md hover:bg-slate-50 transition-colors"
                        onClick={() => setOpenDropdown(null)}
                      >
                        <span className="text-sm font-medium text-slate-900">{item.label}</span>
                        {item.description && (
                          <span className="text-xs text-slate-500">{item.description}</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <Link
              to="/find-us"
              className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-50"
            >
              Locations
            </Link>
          </nav>

          {/* Right side: CTA + mobile menu */}
          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:inline-flex">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
            <Link to="/open-account" className="hidden sm:inline-flex">
              <Button size="sm" style={primaryColor ? { backgroundColor: primaryColor } : undefined}>
                Join
              </Button>
            </Link>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="lg:hidden border-t bg-white max-h-[80vh] overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
            {dropdowns.map((dropdown) => (
              <div key={dropdown.label}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 mt-3">
                  {dropdown.label}
                </p>
                {dropdown.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}

            <div className="border-t my-3" />
            <Link
              to="/find-us"
              className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md"
              onClick={() => setMobileOpen(false)}
            >
              Locations
            </Link>
            <Link
              to="/rates"
              className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md"
              onClick={() => setMobileOpen(false)}
            >
              Rates
            </Link>

            <div className="border-t my-3" />
            <div className="flex gap-2 px-3">
              <Link to="/auth" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button variant="outline" size="sm" className="w-full">Sign In</Button>
              </Link>
              <Link to="/open-account" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full">Join</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
