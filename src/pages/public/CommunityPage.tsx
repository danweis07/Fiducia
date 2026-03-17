import { Link } from 'react-router-dom';
import { PublicShell } from '@/components/public/PublicShell';
import { SEOHead } from '@/components/public/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Heart,
  BookOpen,
  Briefcase,
  Building2,
  ShieldCheck,
  Users,
  Leaf,
  TreePine,
  Handshake,
  ArrowRight,
} from 'lucide-react';

const programs = [
  {
    icon: BookOpen,
    title: 'Financial Literacy Workshops',
    stat: '500+ events/year',
    description:
      'Free workshops and seminars covering budgeting, credit building, homebuying, retirement planning, and youth financial education across our service area.',
  },
  {
    icon: Briefcase,
    title: 'Small Business Grants',
    stat: '50 awarded annually',
    description:
      'Our annual small business grant program awards $10,000 each to 50 local entrepreneurs and small business owners to help them grow and create jobs.',
  },
  {
    icon: Building2,
    title: 'Community Development Loans',
    stat: '$15M+ deployed',
    description:
      'Below-market-rate loans for affordable housing projects, community facilities, and neighborhood revitalization initiatives throughout the Delaware Valley.',
  },
  {
    icon: ShieldCheck,
    title: 'Disaster Relief Fund',
    stat: 'Always ready',
    description:
      'Our emergency assistance fund provides low-interest loans, payment deferrals, and grants to members and communities affected by natural disasters.',
  },
];

const partners = [
  {
    name: 'Anytown Food Bank',
    description:
      'Serving over 50,000 families annually across the Delaware Valley. Demo CU is a founding sponsor and provides $250,000 in annual funding plus 2,000+ volunteer hours.',
    impact: '50,000 families served annually',
  },
  {
    name: 'Delaware Valley Habitat for Humanity',
    description:
      'Building affordable homes for families in need. Our employees have helped build 35 homes since 2010, and we provide $150,000 in annual sponsorship funding.',
    impact: '35 homes built since 2010',
  },
  {
    name: 'Youth Achievement Center',
    description:
      'After-school programs for underserved youth focusing on academics, arts, and career readiness. We fund 10 college scholarships annually through this partnership.',
    impact: '1,200 youth served per year',
  },
];

const greenInitiatives = [
  'Paperless banking with e-statements and digital notifications',
  'Solar panels installed at 8 branch locations',
  '5 LEED-certified branch buildings',
  'Electric vehicle charging stations at headquarters',
  'Annual electronic waste recycling drives',
  'Carbon-neutral operations goal by 2030',
];

export default function CommunityPage() {
  return (
    <PublicShell tenantName="Demo CU">
      <SEOHead
        title="Community Involvement | Demo Credit Union"
        description="Demo CU is invested in our community with $2.5M+ in annual charitable giving, financial literacy programs, and volunteer initiatives since 1952."
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Heart className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Invested in Our Community</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Since 1952, Demo Credit Union has been more than a financial institution —
            we&apos;re a neighbor, partner, and champion for the communities we serve.
          </p>
        </div>
      </section>

      {/* Foundation */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">The Demo CU Foundation</h2>
            <div className="inline-flex items-center gap-3 bg-blue-50 rounded-full px-6 py-3">
              <Heart className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-semibold text-blue-700">$2.5M+ in annual charitable giving since 1952</span>
            </div>
            <p className="text-slate-600 mt-6 max-w-2xl mx-auto">
              The Demo CU Foundation directs our community investment strategy, funding programs
              that build financial capability, strengthen neighborhoods, and create opportunity
              across Pennsylvania, New Jersey, and Delaware.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {programs.map((program) => (
              <Card key={program.title} className="border border-slate-200">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <program.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-slate-900">{program.title}</CardTitle>
                      <p className="text-sm font-medium text-blue-600">{program.stat}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600">{program.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Volunteers */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto text-center">
          <Users className="h-10 w-10 text-blue-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Our People Make the Difference</h2>
          <p className="text-slate-600 max-w-2xl mx-auto mb-10">
            Community involvement isn&apos;t just a corporate initiative — it&apos;s part of who we are.
            Our employees are passionate about giving back.
          </p>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-4xl font-bold text-blue-600">850+</p>
              <p className="text-slate-600 mt-2">Employees who volunteer</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-4xl font-bold text-blue-600">15,000+</p>
              <p className="text-slate-600 mt-2">Volunteer hours annually</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-4xl font-bold text-blue-600">200+</p>
              <p className="text-slate-600 mt-2">Organizations supported</p>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Spotlight */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Handshake className="h-10 w-10 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Partner Spotlight</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              We&apos;re proud to partner with outstanding local organizations that share our
              commitment to building stronger communities.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {partners.map((partner) => (
              <Card key={partner.name} className="border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900">{partner.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm mb-4">{partner.description}</p>
                  <div className="bg-blue-50 rounded-lg px-4 py-2">
                    <p className="text-sm font-semibold text-blue-700">{partner.impact}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Environmental */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Leaf className="h-8 w-8 text-green-600" />
              <TreePine className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Green Initiatives</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              We&apos;re committed to reducing our environmental footprint and promoting
              sustainable practices across our operations.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {greenInitiatives.map((initiative) => (
              <div key={initiative} className="flex items-center gap-3 bg-white rounded-lg p-4 shadow-sm">
                <Leaf className="h-5 w-5 text-green-500 flex-shrink-0" />
                <p className="text-slate-700">{initiative}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Get Involved</h2>
          <p className="text-blue-100 mb-8 text-lg">
            Whether you want to volunteer, apply for a scholarship, or learn more about our
            community programs, we&apos;d love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8">
              <Link to="/scholarships">
                Learn More about Scholarships <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-blue-700 text-lg px-8">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
