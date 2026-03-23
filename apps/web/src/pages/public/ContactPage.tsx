import { Link } from "react-router-dom";
import { PublicShell } from "@/components/public/PublicShell";
import { SEOHead } from "@/components/public/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Phone,
  Mail,
  MapPin,
  Building2,
  AlertTriangle,
  CreditCard,
  Calendar,
  Globe,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  ArrowRight,
} from "lucide-react";

const contactMethods = [
  {
    icon: Phone,
    title: "Phone",
    primary: "(800) 555-0199",
    details: ["Mon-Fri: 7am - 7pm EST", "Sat: 9am - 2pm EST"],
  },
  {
    icon: Mail,
    title: "Email",
    primary: "support@example-cu.org",
    details: [
      "Secure messaging available in online banking",
      "Typical response within 1 business day",
    ],
  },
  {
    icon: MapPin,
    title: "Mail",
    primary: "Demo Credit Union",
    details: ["100 Credit Union Way", "Anytown, US 10001"],
  },
  {
    icon: Building2,
    title: "In Person",
    primary: "Multiple branches nationwide",
    details: ["Full-service banking at every location"],
    link: { to: "/find-us", label: "Find a Branch" },
  },
];

const socialLinks = [
  { icon: Facebook, label: "Facebook", href: "#" },
  { icon: Twitter, label: "Twitter", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
];

export default function ContactPage() {
  return (
    <PublicShell tenantName="Demo Credit Union">
      <SEOHead
        title="Contact Us | Demo Credit Union"
        description="Get in touch with Demo Credit Union. Call (800) 555-0199, email support@example-cu.org, or visit one of our branch locations."
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Contact Us</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            We&apos;re here to help. Reach out by phone, email, mail, or visit any of our branch
            locations.
          </p>
        </div>
      </section>

      {/* Contact Methods Grid */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            {contactMethods.map((method) => (
              <Card key={method.title} className="border border-slate-200">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <method.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg text-slate-900">{method.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold text-slate-900 mb-2">{method.primary}</p>
                  {method.details.map((detail) => (
                    <p key={detail} className="text-slate-600 text-sm">
                      {detail}
                    </p>
                  ))}
                  {method.link && (
                    <Link
                      to={method.link.to}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm mt-3"
                    >
                      {method.link.label} <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Contacts */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Emergency &amp; Urgent
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-2 border-red-200 bg-red-50">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-red-900">Report Fraud</CardTitle>
                    <p className="text-sm text-red-700">Dedicated fraud hotline</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-700 mb-2">(800) 555-FRAU (3728)</p>
                <p className="text-red-600 font-medium">Available 24/7</p>
                <p className="text-sm text-red-600 mt-2">
                  If you suspect unauthorized activity on your account, call immediately. Do not
                  delay reporting — early detection limits losses.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-200 bg-amber-50">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CreditCard className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-amber-900">Lost or Stolen Card</CardTitle>
                    <p className="text-sm text-amber-700">Card services hotline</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-700 mb-2">(800) 555-CARD (2273)</p>
                <p className="text-amber-600 font-medium">Available 24/7</p>
                <p className="text-sm text-amber-600 mt-2">
                  Report a lost or stolen debit or credit card immediately. We&apos;ll freeze your
                  card and issue a replacement right away.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Book Appointment */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <Calendar className="h-10 w-10 text-blue-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Book an Appointment</h2>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto">
            Skip the wait. Schedule a one-on-one meeting with a financial specialist at your
            preferred branch. Available for account openings, loan consultations, mortgage
            pre-approvals, and financial planning.
          </p>
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
            <Link to="/find-us">
              Schedule Appointment <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Routing & Wire Info */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Banking Details</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card className="border border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">Routing Number</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-mono font-bold text-blue-600">265473851</p>
                <p className="text-sm text-slate-500 mt-2">
                  Use for direct deposits, ACH transfers, and domestic wire transfers.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-slate-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg text-slate-900">International Wires</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600 mb-1">SWIFT Code</p>
                <p className="text-2xl font-mono font-bold text-blue-600">WFCUUS33</p>
                <p className="text-sm text-slate-500 mt-2">
                  Required for incoming international wire transfers. Contact us for full
                  instructions.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Social Media */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Connect with Us</h2>
          <p className="text-slate-600 mb-8">
            Follow us on social media for news, financial tips, and community updates.
          </p>
          <div className="flex items-center justify-center gap-6">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="w-12 h-12 bg-slate-100 hover:bg-blue-100 rounded-full flex items-center justify-center transition-colors"
              >
                <social.icon className="h-5 w-5 text-slate-600 hover:text-blue-600" />
              </a>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
