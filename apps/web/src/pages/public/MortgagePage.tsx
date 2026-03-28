import { Link } from "react-router-dom";
import { PublicShell } from "@/components/public/PublicShell";
import { SEOHead } from "@/components/public/SEOHead";
import { tenantConfig } from "@/lib/tenant.config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  CheckCircle,
  ArrowRight,
  Shield,
  Calculator,
  Star,
  Users,
  FileText,
} from "lucide-react";

export default function MortgagePage() {
  return (
    <PublicShell tenantName={tenantConfig.name}>
      <SEOHead
        title={`Mortgage & Home Loans | ${tenantConfig.name}`}
        description="Find your dream home with competitive mortgage rates. 30-year fixed from 6.375%, 15-year fixed from 5.750%. FHA, VA, and jumbo loans available."
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="bg-blue-600 text-white mb-4 text-sm px-4 py-1">Rates from 5.25%</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Your Dream Home Starts Here</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Whether you're buying your first home, upgrading, or refinancing, {tenantConfig.name}
            offers competitive rates, low closing costs, and personalized service every step of the
            way.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
              <Link to="/apply-loan">Get Pre-Approved</Link>
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

      {/* Rate Table */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            Today's Mortgage Rates
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Rates shown are for well-qualified borrowers. Your rate may vary based on credit score,
            down payment, and loan amount. Contact us for a personalized quote.
          </p>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* 30-Year Fixed */}
            <Card className="border-2 border-slate-200 hover:border-blue-300 transition-colors text-center">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">30-Year Fixed</CardTitle>
                <Badge className="w-fit mx-auto bg-slate-100 text-slate-700">Most Popular</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-blue-600">6.375%</p>
                <p className="text-sm text-slate-500 mb-1">Rate</p>
                <p className="text-2xl font-semibold text-slate-700">6.50%</p>
                <p className="text-sm text-slate-500 mb-4">APR</p>
                <p className="text-sm text-slate-600">
                  Predictable payments for the life of your loan. The most popular choice for
                  homebuyers.
                </p>
              </CardContent>
            </Card>

            {/* 15-Year Fixed */}
            <Card className="border-2 border-blue-500 shadow-lg text-center relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-4">Best Rate</Badge>
              </div>
              <CardHeader className="pt-8">
                <CardTitle className="text-lg text-slate-900">15-Year Fixed</CardTitle>
                <Badge className="w-fit mx-auto bg-green-100 text-green-700">
                  Save on Interest
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-blue-600">5.750%</p>
                <p className="text-sm text-slate-500 mb-1">Rate</p>
                <p className="text-2xl font-semibold text-slate-700">5.89%</p>
                <p className="text-sm text-slate-500 mb-4">APR</p>
                <p className="text-sm text-slate-600">
                  Build equity faster and pay significantly less interest over the life of the loan.
                </p>
              </CardContent>
            </Card>

            {/* 5/1 ARM */}
            <Card className="border-2 border-slate-200 hover:border-blue-300 transition-colors text-center">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">5/1 ARM</CardTitle>
                <Badge className="w-fit mx-auto bg-slate-100 text-slate-700">
                  Lowest Start Rate
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold text-blue-600">5.25%</p>
                <p className="text-sm text-slate-500 mb-1">Rate</p>
                <p className="text-2xl font-semibold text-slate-700">5.45%</p>
                <p className="text-sm text-slate-500 mb-4">APR</p>
                <p className="text-sm text-slate-600">
                  Fixed rate for the first 5 years, then adjusts annually. Great if you plan to move
                  or refinance.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Loan Types */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "FHA Loans",
                desc: "Low down payment (3.5%), flexible credit requirements. Ideal for first-time buyers.",
                icon: Home,
              },
              {
                title: "VA Loans",
                desc: "Zero down payment for eligible veterans and active military. No PMI required.",
                icon: Shield,
              },
              {
                title: "Jumbo Loans",
                desc: "For loan amounts exceeding conforming limits. Competitive rates on luxury properties.",
                icon: FileText,
              },
            ].map((loan) => (
              <Card key={loan.title} className="border border-slate-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <loan.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900">{loan.title}</h3>
                  </div>
                  <p className="text-sm text-slate-600">{loan.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* First-Time Homebuyer */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-blue-100 text-blue-800 mb-4">First-Time Homebuyers</Badge>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Buying Your First Home?</h2>
              <p className="text-slate-600 mb-6">
                We make the process easy and affordable. Our mortgage specialists will guide you
                from pre-approval to closing day with personalized support at every step.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Down payments as low as 3%",
                  "First-time homebuyer education program",
                  "Down payment assistance program eligibility",
                  "Dedicated mortgage advisor throughout the process",
                  "Free pre-approval with no obligation",
                  "Closing cost credits for qualified borrowers",
                ].map((benefit) => (
                  <li key={benefit} className="flex items-center gap-2 text-slate-700">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link to="/apply-loan">
                  Get Pre-Approved <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6 text-center">
                {`Why ${tenantConfig.shortName} for Your Mortgage?`}
              </h3>
              <div className="space-y-6">
                {[
                  {
                    icon: Star,
                    title: "Competitive Rates",
                    desc: "Credit union rates are typically lower than big banks",
                  },
                  {
                    icon: Users,
                    title: "Local Decisions",
                    desc: "Loans are approved and serviced right here — not sold off",
                  },
                  {
                    icon: Calculator,
                    title: "Low Fees",
                    desc: "Minimal closing costs and no hidden origination charges",
                  },
                  {
                    icon: Shield,
                    title: "Member Focused",
                    desc: "We succeed when you succeed — not the other way around",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                      <item.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">{item.title}</h4>
                      <p className="text-sm text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Take the First Step Toward Homeownership</h2>
          <p className="text-blue-100 mb-8 text-lg">
            Get pre-approved online in minutes. Know exactly how much home you can afford before you
            start shopping.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8"
            >
              <Link to="/apply-loan">Get Pre-Approved</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-blue-700 text-lg px-8"
            >
              <Link to="/calculators">Calculate Payment</Link>
            </Button>
          </div>
          <p className="text-blue-200 text-xs mt-6">
            Rates effective as of March 14, 2026 and are subject to change without notice. APR =
            Annual Percentage Rate. All loans subject to credit approval.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
