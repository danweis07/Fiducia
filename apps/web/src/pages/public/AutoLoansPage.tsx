import { Link } from "react-router-dom";
import { PublicShell } from "@/components/public/PublicShell";
import { SEOHead } from "@/components/public/SEOHead";
import { tenantConfig } from "@/lib/tenant.config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Car,
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Zap,
  ShieldCheck,
  XCircle,
  ArrowRight,
} from "lucide-react";

const products = [
  {
    title: "New Auto",
    rate: "5.24",
    term: "Up to 84 months",
    description: "Finance your brand-new vehicle with our lowest rate.",
    icon: Car,
    color: "blue",
    highlights: [
      "Finance up to 100% MSRP",
      "Include tax, title & warranty",
      "No prepayment penalty",
    ],
    featured: true,
  },
  {
    title: "Used Auto",
    rate: "5.74",
    term: "Up to 72 months",
    description: "Great rates on quality pre-owned vehicles.",
    icon: Car,
    color: "slate",
    highlights: [
      "Dealership or private party",
      "Competitive rates for all model years",
      "No prepayment penalty",
    ],
    featured: false,
  },
  {
    title: "Refinance",
    rate: "5.49",
    term: "Save on your current loan",
    description: "Lower your rate and reduce your monthly payment.",
    icon: RefreshCw,
    color: "green",
    highlights: [
      "Lower your monthly payment",
      "Reduce your interest rate",
      "Skip up to 2 payments at closing",
    ],
    featured: false,
  },
];

const benefits = [
  {
    icon: Zap,
    title: "Quick 24-Hour Approval",
    desc: "Get a decision within 24 hours of applying — no waiting around.",
  },
  {
    icon: Clock,
    title: "Flexible Terms 36-84 Months",
    desc: "Choose the repayment schedule that fits your budget.",
  },
  {
    icon: DollarSign,
    title: "No Prepayment Penalty",
    desc: "Pay off your loan early without any extra fees.",
  },
  {
    icon: Car,
    title: "Dealership or Private Party",
    desc: "Finance from any dealership or a private party seller.",
  },
  {
    icon: ShieldCheck,
    title: "GAP Insurance Available",
    desc: "Protect yourself from owing more than your car is worth.",
  },
];

const comparison = [
  { feature: "Average APR", creditUnion: "5.24% - 5.74%", dealership: "7.99% - 12.99%" },
  { feature: "Loan terms", creditUnion: "Up to 84 months", dealership: "Limited options" },
  {
    feature: "Pre-approval",
    creditUnion: "Yes, shop with confidence",
    dealership: "Rarely offered",
  },
  { feature: "Prepayment penalty", creditUnion: "Never", dealership: "Often included" },
  { feature: "Markup on rate", creditUnion: "No dealer markup", dealership: "Dealer adds 1-3%" },
  { feature: "Refinance option", creditUnion: "Easy refinancing", dealership: "Not available" },
];

export default function AutoLoansPage() {
  return (
    <PublicShell tenantName={tenantConfig.shortName}>
      <SEOHead
        title={`Auto Loans | ${tenantConfig.name}`}
        description="Finance your next vehicle with rates as low as 5.24% APR. New, used, and refinance auto loans with flexible terms up to 84 months."
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Drive Your Dream</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            Get behind the wheel with an auto loan built for you — not the dealership. Low rates,
            flexible terms, and a quick approval process that puts you in the driver&apos;s seat.
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
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Auto Loan Options</h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Whether you&apos;re buying new, used, or looking to refinance, we have the right loan
            for you.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {products.map((product) => (
              <Card
                key={product.title}
                className={`border-2 ${product.featured ? "border-blue-500 shadow-lg" : "border-slate-200 hover:border-blue-300"} transition-colors`}
              >
                <CardHeader className="text-center">
                  <div
                    className={`w-14 h-14 ${product.color === "green" ? "bg-green-100" : product.color === "blue" ? "bg-blue-100" : "bg-slate-100"} rounded-full flex items-center justify-center mx-auto mb-3`}
                  >
                    <product.icon
                      className={`h-7 w-7 ${product.color === "green" ? "text-green-600" : product.color === "blue" ? "text-blue-600" : "text-slate-600"}`}
                    />
                  </div>
                  <CardTitle className="text-xl text-slate-900">{product.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`${product.color === "green" ? "bg-green-50" : "bg-blue-50"} rounded-lg p-4 mb-4 text-center`}
                  >
                    <p className="text-sm text-slate-600">Rates as low as</p>
                    <p
                      className={`text-4xl font-bold ${product.color === "green" ? "text-green-600" : "text-blue-600"}`}
                    >
                      {product.rate}%
                    </p>
                    <p className="text-sm text-slate-500">APR*</p>
                  </div>
                  <p className="text-sm text-slate-600 mb-2 font-medium">{product.term}</p>
                  <ul className="space-y-2 text-sm text-slate-700 mb-6">
                    {product.highlights.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> {item}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                    <Link to="/apply-loan">Apply Now</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            {`Benefits of a ${tenantConfig.shortName} Auto Loan`}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{benefit.title}</h3>
                  <p className="text-sm text-slate-600">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Finance with Demo CU */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            {`Why Finance with ${tenantConfig.shortName}?`}
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            See how credit union financing stacks up against typical dealership offers.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-4 text-slate-700 font-semibold">Feature</th>
                  <th className="text-left p-4 text-blue-700 font-semibold">
                    {tenantConfig.shortName}
                  </th>
                  <th className="text-left p-4 text-slate-500 font-semibold">
                    Dealership Financing
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature} className="border-b border-slate-200">
                    <td className="p-4 text-slate-700 font-medium">{row.feature}</td>
                    <td className="p-4 text-blue-700 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {row.creditUnion}
                    </td>
                    <td className="p-4 text-slate-500 flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                      {row.dealership}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Hit the Road?</h2>
          <p className="text-blue-100 mb-8 text-lg">
            Apply online in minutes and get pre-approved before you shop. Your dream car is closer
            than you think.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8"
            >
              <Link to="/apply-loan">
                Apply Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
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
            *APR = Annual Percentage Rate. Rates are subject to change and based on
            creditworthiness, loan amount, term, and vehicle age. All loans subject to credit
            approval.
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
