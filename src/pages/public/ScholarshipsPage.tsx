import { Link } from 'react-router-dom';
import { PublicShell } from '@/components/public/PublicShell';
import { SEOHead } from '@/components/public/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GraduationCap,
  Award,
  Calendar,
  CheckCircle,
  Users,
  DollarSign,
  BookOpen,
  FileText,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';

const eligibility = [
  'Must be a Demo CU member or dependent of a current member',
  'Enrolled or accepted at an accredited college, university, or trade school',
  'Maintain a cumulative GPA of 3.0 or higher',
  'Demonstrate active community involvement and volunteer service',
  'Submit a 500-word essay on financial literacy and community impact',
];

const timeline = [
  { icon: Calendar, date: 'January 1', label: 'Applications Open', description: 'Online application portal opens for the current academic year.' },
  { icon: ClipboardList, date: 'March 31', label: 'Application Deadline', description: 'All materials including essay and transcripts must be submitted.' },
  { icon: Users, date: 'May 15', label: 'Recipients Announced', description: 'Scholarship committee notifies selected recipients by email and phone.' },
  { icon: DollarSign, date: 'August 1', label: 'Awards Disbursed', description: 'Funds sent directly to the recipient\'s educational institution.' },
];

const pastRecipients = [
  {
    name: 'Amara Johnson',
    school: 'Temple University',
    major: 'Nursing',
    quote:
      'The Demo CU Scholars Program helped me pursue my dream of becoming a nurse without the burden of extra student debt. I\'m grateful for their investment in my future.',
  },
  {
    name: 'Carlos Rivera',
    school: 'Drexel University',
    major: 'Computer Science',
    quote:
      'As a first-generation college student, this scholarship meant everything to me. Demo CU didn\'t just give me money — they gave me confidence that my community believes in me.',
  },
  {
    name: 'Priya Patel',
    school: 'University of Delaware',
    major: 'Environmental Science',
    quote:
      'The scholarship allowed me to focus on my research into sustainable water systems. I\'m proud to be a Demo CU Scholar and to give back to the community that invested in me.',
  },
];

const howToApply = [
  { step: '1', title: 'Verify Membership', description: 'Confirm that you or your parent/guardian is a current Demo CU member in good standing. Not a member yet? Open an account with just $5.' },
  { step: '2', title: 'Complete Application', description: 'Fill out the online application form with your personal information, academic history, extracurricular activities, and community involvement.' },
  { step: '3', title: 'Submit Essay', description: 'Write a 500-word essay on how financial literacy has impacted your life and how you plan to contribute to your community after graduation.' },
  { step: '4', title: 'Provide Transcripts', description: 'Upload or mail official or unofficial transcripts showing your cumulative GPA. Transcripts must be from the most recent completed semester.' },
];

export default function ScholarshipsPage() {
  return (
    <PublicShell tenantName="Demo CU">
      <SEOHead
        title="Demo CU Scholars Program | Demo Credit Union"
        description="Apply for the Demo CU Scholars Program. $250,000 awarded annually — 50 scholarships of $5,000 each for members and their dependents."
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <GraduationCap className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Demo CU Scholars Program</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Investing in the next generation of leaders. We&apos;re proud to support our members
            and their families on their educational journey.
          </p>
        </div>
      </section>

      {/* Program Overview */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Program Overview</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              The Demo CU Scholars Program awards scholarships to deserving students who
              demonstrate academic excellence, community involvement, and a commitment to
              financial responsibility.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 mb-12">
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <p className="text-3xl font-bold text-blue-600">$250,000</p>
              <p className="text-slate-600 mt-1">Awarded annually</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <Award className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <p className="text-3xl font-bold text-blue-600">50</p>
              <p className="text-slate-600 mt-1">Scholarships of $5,000 each</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-6 text-center">
              <GraduationCap className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <p className="text-3xl font-bold text-blue-600">800+</p>
              <p className="text-slate-600 mt-1">Students supported since 2005</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-8 text-center">
            <p className="text-lg text-slate-700">
              Since 2005, the Demo CU Scholars Program has awarded over <strong className="text-blue-600">$4 million</strong> to
              more than <strong className="text-blue-600">800 students</strong>, helping them achieve their academic and
              career goals.
            </p>
          </div>
        </div>
      </section>

      {/* Eligibility */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <BookOpen className="h-10 w-10 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Eligibility Requirements</h2>
          </div>
          <div className="space-y-4">
            {eligibility.map((item) => (
              <div key={item} className="flex items-start gap-3 bg-white rounded-lg p-4 shadow-sm">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Timeline */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Application Timeline</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {timeline.map((item) => (
              <div key={item.label} className="text-center">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-7 w-7 text-blue-600" />
                </div>
                <p className="text-lg font-bold text-blue-600 mb-1">{item.date}</p>
                <h3 className="font-semibold text-slate-900 mb-2">{item.label}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Past Recipients */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Past Recipients Spotlight</h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Meet some of the talented students who have been awarded Demo CU Scholarships.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {pastRecipients.map((recipient) => (
              <Card key={recipient.name} className="border border-slate-200">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <GraduationCap className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg text-slate-900 text-center">{recipient.name}</CardTitle>
                  <p className="text-sm text-blue-600 text-center font-medium">{recipient.school}</p>
                  <p className="text-sm text-slate-500 text-center">{recipient.major}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm italic">&ldquo;{recipient.quote}&rdquo;</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How to Apply */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <FileText className="h-10 w-10 text-blue-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-slate-900 mb-4">How to Apply</h2>
          </div>
          <div className="space-y-6">
            {howToApply.map((item) => (
              <div key={item.step} className="flex items-start gap-6 bg-slate-50 rounded-xl p-6">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-slate-600 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Apply?</h2>
          <p className="text-blue-100 mb-8 text-lg">
            The 2026 application period is open. Don&apos;t miss your chance to earn a $5,000
            scholarship from Demo Credit Union.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8">
              <Link to="/p/scholarship-application">
                Apply Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-blue-700 text-lg px-8">
              <Link to="/contact">Have Questions?</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
