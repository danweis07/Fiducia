import { Link } from 'react-router-dom';
import { PublicShell } from '@/components/public/PublicShell';
import { SEOHead } from '@/components/public/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Briefcase,
  Heart,
  GraduationCap,
  Clock,
  DollarSign,
  Shield,
  Users,
  MapPin,
  ArrowRight,
} from 'lucide-react';

const benefits = [
  {
    icon: DollarSign,
    title: 'Competitive Salary',
    description: 'Market-leading compensation reviewed annually with performance bonuses.',
  },
  {
    icon: Shield,
    title: '401(k) with 6% Match',
    description: 'We match your contributions dollar-for-dollar up to 6% of your salary.',
  },
  {
    icon: Heart,
    title: 'Medical, Dental & Vision',
    description: 'Comprehensive health coverage for you and your family from day one.',
  },
  {
    icon: GraduationCap,
    title: 'Tuition Reimbursement',
    description: 'Up to $5,250 per year toward continuing education and professional certifications.',
  },
  {
    icon: Users,
    title: 'Paid Parental Leave',
    description: '12 weeks of fully paid parental leave for all new parents.',
  },
  {
    icon: Clock,
    title: 'Flexible PTO',
    description: 'Minimum 20 days paid time off plus 11 paid holidays per year.',
  },
  {
    icon: Briefcase,
    title: 'Employee Loan Discounts',
    description: 'Reduced rates on mortgages, auto loans, and personal loans for all employees.',
  },
  {
    icon: MapPin,
    title: 'Hybrid & Remote Options',
    description: 'Flexible work arrangements available for many positions across the organization.',
  },
];

const openPositions = [
  {
    title: 'Senior Software Engineer (Digital Banking)',
    department: 'Technology',
    location: 'Remote',
    type: 'Full-time',
  },
  {
    title: 'Branch Manager',
    department: 'Retail Banking',
    location: 'Anytown, US',
    type: 'Full-time',
  },
  {
    title: 'Mortgage Loan Officer',
    department: 'Lending',
    location: 'Satellite Office',
    type: 'Full-time',
  },
  {
    title: 'Data Analyst',
    department: 'Business Intelligence',
    location: 'Headquarters',
    type: 'Full-time',
  },
  {
    title: 'Member Service Representative',
    department: 'Retail Banking',
    location: 'Multiple Locations',
    type: 'Full-time / Part-time',
  },
  {
    title: 'Compliance Analyst',
    department: 'Risk & Compliance',
    location: 'Headquarters',
    type: 'Full-time',
  },
  {
    title: 'UX Designer',
    department: 'Technology',
    location: 'Remote / Hybrid',
    type: 'Full-time',
  },
  {
    title: 'VP of Commercial Lending',
    department: 'Commercial Banking',
    location: 'Regional Office',
    type: 'Full-time',
  },
  {
    title: 'IT Security Engineer',
    department: 'Information Security',
    location: 'Remote',
    type: 'Full-time',
  },
  {
    title: 'Financial Advisor',
    department: 'Wealth Management',
    location: 'Branch Office',
    type: 'Full-time',
  },
];

const testimonials = [
  {
    quote:
      'I joined the credit union as a teller right out of college, and the investment they made in my growth has been incredible. Ten years later, I am leading a team of 15 as a branch manager. The tuition reimbursement program helped me earn my MBA while working full-time.',
    name: 'Jessica Torres',
    role: 'Branch Manager, 10 years',
  },
  {
    quote:
      'The engineering culture here is something special. We are building real products that help real people manage their money better. The remote-first approach and flexible hours let me do my best work while being present for my family.',
    name: 'Amir Patel',
    role: 'Senior Software Engineer, 3 years',
  },
  {
    quote:
      'What drew me here was the community focus. Every quarter, our team volunteers together at local organizations. It is more than a job — you genuinely feel like you are making a difference in people\'s lives.',
    name: 'Danielle Brooks',
    role: 'Compliance Analyst, 5 years',
  },
];

export default function CareersPage() {
  return (
    <PublicShell>
      <SEOHead
        title="Careers - Demo Credit Union"
        description="Join the Demo Credit Union team. Explore open positions, competitive benefits, and a culture built around making a difference."
      />

      {/* Hero */}
      <section className="bg-blue-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Build Your Career With Us
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Join a team of 850+ professionals who are passionate about helping members achieve
            their financial goals and strengthening the communities we serve.
          </p>
        </div>
      </section>

      {/* Why Work Here */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Why Work Here?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            <div>
              <div className="w-14 h-14 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Briefcase className="w-7 h-7 text-blue-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                &ldquo;Best Places to Work&rdquo; Award
              </h3>
              <p className="text-slate-600">
                Recognized five years running for outstanding workplace culture and employee
                satisfaction.
              </p>
            </div>
            <div>
              <div className="w-14 h-14 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Heart className="w-7 h-7 text-blue-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Member-First Culture
              </h3>
              <p className="text-slate-600">
                Every role connects to our mission of empowering members. You will see
                the direct impact of your work every day.
              </p>
            </div>
            <div>
              <div className="w-14 h-14 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Users className="w-7 h-7 text-blue-700" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Diverse & Inclusive Workplace
              </h3>
              <p className="text-slate-600">
                We are committed to building a workforce that reflects the diverse communities we
                serve, with active employee resource groups and inclusive hiring practices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-slate-50 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
            Benefits & Perks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <Card key={benefit.title}>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-blue-700" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-slate-600">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-2 text-center">Open Positions</h2>
          <p className="text-slate-600 text-center mb-10">
            We are always looking for talented individuals to join our team.
          </p>
          <div className="space-y-4">
            {openPositions.map((position) => (
              <Card key={position.title} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">{position.title}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {position.department}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {position.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {position.type}
                      </span>
                    </div>
                  </div>
                  <Button asChild variant="outline" className="shrink-0">
                    <Link to="/p/careers" className="flex items-center gap-2">
                      Apply
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Employee Testimonials */}
      <section className="bg-slate-50 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
            Hear From Our Team
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name}>
                <CardContent className="p-6">
                  <p className="text-slate-600 italic leading-relaxed mb-4">
                    &ldquo;{testimonial.quote}&rdquo;
                  </p>
                  <div className="border-t pt-4">
                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-slate-500">{testimonial.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Don&apos;t See the Right Fit?
          </h2>
          <p className="text-slate-600 text-lg mb-2">
            We are always interested in hearing from talented people. Send us your resume and
            we will keep you in mind for future opportunities.
          </p>
          <p className="text-blue-700 font-medium text-lg mb-8">
            <a href="mailto:careers@example-cu.org" className="hover:underline">
              careers@example-cu.org
            </a>
          </p>
          <Button asChild size="lg" className="bg-blue-700 hover:bg-blue-800">
            <Link to="/open-account">Become a Member</Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
