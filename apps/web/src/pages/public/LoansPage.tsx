import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import { PublicShell } from "@/components/public/PublicShell";
import { SEOHead } from "@/components/public/SEOHead";
import { useCMSPageContent } from "@/hooks/useCMSContent";
import { tenantConfig } from "@/lib/tenant.config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Home,
  Car,
  CreditCard,
  CheckCircle,
  ArrowRight,
  Calculator,
} from "lucide-react";

export default function LoansPage() {
  const { data: cmsPage } = useCMSPageContent("loans");

  if (cmsPage) {
    return (
      <PublicShell tenantName={tenantConfig.name}>
        <SEOHead
          title={cmsPage.title ?? `Personal Loans, Auto Loans & More | ${tenantConfig.name}`}
          description="Get the funds you need with competitive rates. Personal loans from 7.49% APR, auto loans from 5.24% APR, and home equity from 6.99% APR."
        />
        <article
          className="prose max-w-4xl mx-auto py-12 px-4"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(cmsPage.body ?? "") }}
        />
      </PublicShell>
    );
  }

  return (
    <PublicShell tenantName={tenantConfig.name}>
      <SEOHead
        title={`Personal Loans, Auto Loans & More | ${tenantConfig.name}`}
        description="Get the funds you need with competitive rates. Personal loans from 7.49% APR, auto loans from 5.24% APR, and home equity from 6.99% APR."
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="bg-blue-600 text-white mb-4 text-sm px-4 py-1">
            Rates as low as 5.24% APR
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Loans for Every Need</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Whether you're consolidating debt, buying a car, or tapping into your home's equity,
            {tenantConfig.shortName} has competitive rates and flexible terms to help you reach your
            goals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
              <Link to="/apply-loan">Apply Now</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-slate-400 text-slate-200 hover:bg-slate-800 text-lg px-8"
            >
              <Link to="/calculators">Calculate Payment</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Loan Products */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Our Loan Products</h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Compare our loan options and find the right fit. All loans feature no origination fees
            and no prepayment penalties.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Personal Loans */}
            <Card className="border-2 border-slate-200 hover:border-blue-300 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-slate-900">Personal Loans</CardTitle>
                    <p className="text-sm text-slate-500">For whatever life throws your way</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-slate-600">Rates from</span>
                    <span className="text-2xl font-bold text-blue-600">7.49% APR</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-sm text-slate-600">Borrow up to</span>
                    <span className="text-lg font-semibold text-slate-900">$50,000</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-sm text-slate-600">Terms</span>
                    <span className="text-lg font-semibold text-slate-900">12–60 months</span>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Fixed rates — payment never
                    changes
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> No origination or application
                    fee
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Funds available in 1–2
                    business days
                  </li>
                </ul>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link to="/apply-loan">Apply Now</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Home Equity */}
            <Card className="border-2 border-slate-200 hover:border-blue-300 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Home className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-slate-900">Home Equity</CardTitle>
                    <p className="text-sm text-slate-500">Tap into your home's value</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-slate-600">Rates from</span>
                    <span className="text-2xl font-bold text-blue-600">6.99% APR</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-sm text-slate-600">Borrow up to</span>
                    <span className="text-lg font-semibold text-slate-900">90% LTV</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-sm text-slate-600">Terms</span>
                    <span className="text-lg font-semibold text-slate-900">Up to 20 years</span>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Fixed and variable rate
                    options
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Interest may be tax
                    deductible*
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> No annual fee on HELOC
                  </li>
                </ul>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link to="/apply-loan">Apply Now</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Auto Loans */}
            <Card className="border-2 border-blue-500 shadow-lg relative">
              <div className="absolute -top-3 left-4">
                <Badge className="bg-blue-600 text-white px-3">Popular</Badge>
              </div>
              <CardHeader className="pt-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <Car className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-slate-900">Auto Loans</CardTitle>
                    <p className="text-sm text-slate-500">New, used, and refinance</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-slate-600">New auto from</span>
                    <span className="text-2xl font-bold text-blue-600">5.24% APR</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-sm text-slate-600">Used auto from</span>
                    <span className="text-lg font-semibold text-slate-900">5.74% APR</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-sm text-slate-600">Terms</span>
                    <span className="text-lg font-semibold text-slate-900">36–84 months</span>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Quick pre-approval decisions
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Dealership or private party
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> No prepayment penalties
                  </li>
                </ul>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link to="/apply-loan">Apply Now</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Debt Consolidation */}
            <Card className="border-2 border-slate-200 hover:border-blue-300 transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-slate-900">Debt Consolidation</CardTitle>
                    <p className="text-sm text-slate-500">Simplify and save</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-slate-600">Rates from</span>
                    <span className="text-2xl font-bold text-blue-600">7.49% APR</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-sm text-slate-600">Consolidate up to</span>
                    <span className="text-lg font-semibold text-slate-900">$50,000</span>
                  </div>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-sm text-slate-600">Terms</span>
                    <span className="text-lg font-semibold text-slate-900">24–60 months</span>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Combine multiple payments
                    into one
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Lower your overall interest
                    rate
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Free financial counseling
                    included
                  </li>
                </ul>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link to="/apply-loan">Apply Now</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Calculator CTA */}
      <section className="py-12 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Calculator className="h-8 w-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-slate-900">What Will Your Payment Be?</h2>
          </div>
          <p className="text-slate-600 mb-6">
            Use our loan calculator to estimate monthly payments and see how much you could save.
          </p>
          <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
            <Link to="/calculators">
              Calculate Payment <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-blue-100 mb-8 text-lg">
            Apply online in minutes. Our lending team is here to help you find the right loan for
            your needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8"
            >
              <Link to="/apply-loan">Apply Now</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-blue-700 text-lg px-8"
            >
              <Link to="/find-us">Talk to a Loan Officer</Link>
            </Button>
          </div>
          <p className="text-blue-200 text-xs mt-6">
            *Consult a tax advisor regarding the deductibility of interest. All rates are subject to
            credit approval and may vary based on creditworthiness, loan amount, and term. APR =
            Annual Percentage Rate.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
