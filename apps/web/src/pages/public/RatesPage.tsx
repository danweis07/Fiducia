import { Link } from "react-router-dom";
import { PublicShell } from "@/components/public/PublicShell";
import { SEOHead } from "@/components/public/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, PiggyBank, Landmark, CreditCard, Home, ArrowRight } from "lucide-react";

const savingsRates = [
  {
    product: "Regular Savings",
    apy: "0.45%",
    minBalance: "$5",
    details: "No monthly maintenance fee",
  },
  {
    product: "High-Yield Savings",
    apy: "4.25%",
    minBalance: "$500",
    details: "$500 minimum opening deposit",
  },
  {
    product: "Money Market",
    apy: "4.50%",
    minBalance: "$2,500+",
    details: "Tiered rates; higher balances earn more",
  },
];

const cdRates = [
  { term: "3-Month", apy: "4.25%", minDeposit: "$500" },
  { term: "6-Month", apy: "4.75%", minDeposit: "$500" },
  { term: "12-Month", apy: "5.00%", minDeposit: "$500" },
  { term: "24-Month", apy: "4.50%", minDeposit: "$500" },
  { term: "36-Month", apy: "4.25%", minDeposit: "$500" },
  { term: "60-Month", apy: "4.00%", minDeposit: "$500" },
];

const loanRates = [
  { product: "Personal Loan", apr: "from 7.49%", term: "12-60 months" },
  { product: "Auto Loan - New", apr: "from 5.24%", term: "Up to 84 months" },
  { product: "Auto Loan - Used", apr: "from 5.74%", term: "Up to 72 months" },
  { product: "Home Equity Loan", apr: "from 6.99%", term: "5-20 years" },
];

const mortgageRates = [
  { product: "30-Year Fixed", rate: "6.375%", apr: "6.50%" },
  { product: "15-Year Fixed", rate: "5.750%", apr: "5.89%" },
  { product: "5/1 ARM", rate: "5.25%", apr: "5.45%" },
];

const creditCardRates = [
  {
    product: "Rewards Card",
    apr: "14.99% - 24.99% variable",
    details: "Earn 1.5x points on every purchase",
  },
  {
    product: "Cash Back Card",
    apr: "13.99% - 23.99% variable",
    details: "2% cash back on all purchases",
  },
  {
    product: "Low Rate Card",
    apr: "8.99% - 18.99% variable",
    details: "Our lowest rate credit card",
  },
];

export default function RatesPage() {
  return (
    <PublicShell tenantName="Demo CU">
      <SEOHead
        title="Current Rates | Demo Credit Union"
        description="View current savings, CD, loan, mortgage, and credit card rates at Demo Credit Union. Competitive rates for members."
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <TrendingUp className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Current Rates</h1>
          <p className="text-lg text-blue-200">Effective March 14, 2026</p>
          <p className="text-slate-300 max-w-2xl mx-auto mt-4">
            As a not-for-profit credit union, we return our earnings to members through better rates
            on savings and lower rates on loans.
          </p>
        </div>
      </section>

      {/* Savings Rates */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <PiggyBank className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-slate-900">Savings Rates</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-4 text-slate-700 font-semibold">Product</th>
                  <th className="text-left p-4 text-slate-700 font-semibold">APY</th>
                  <th className="text-left p-4 text-slate-700 font-semibold">Minimum Balance</th>
                  <th className="text-left p-4 text-slate-700 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {savingsRates.map((rate) => (
                  <tr key={rate.product} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{rate.product}</td>
                    <td className="p-4 text-blue-600 font-bold text-lg">{rate.apy}</td>
                    <td className="p-4 text-slate-600">{rate.minBalance}</td>
                    <td className="p-4 text-slate-500 text-sm">{rate.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CD Rates */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Landmark className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-slate-900">Certificate / CD Rates</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-4 text-slate-700 font-semibold">Term</th>
                  <th className="text-left p-4 text-slate-700 font-semibold">APY</th>
                  <th className="text-left p-4 text-slate-700 font-semibold">Minimum Deposit</th>
                </tr>
              </thead>
              <tbody>
                {cdRates.map((rate) => (
                  <tr key={rate.term} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{rate.term}</td>
                    <td className="p-4 text-blue-600 font-bold text-lg">{rate.apy}</td>
                    <td className="p-4 text-slate-600">{rate.minDeposit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Loan Rates */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-slate-900">Loan Rates</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-4 text-slate-700 font-semibold">Product</th>
                  <th className="text-left p-4 text-slate-700 font-semibold">APR</th>
                  <th className="text-left p-4 text-slate-700 font-semibold">Term</th>
                </tr>
              </thead>
              <tbody>
                {loanRates.map((rate) => (
                  <tr key={rate.product} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{rate.product}</td>
                    <td className="p-4 text-blue-600 font-bold text-lg">{rate.apr}</td>
                    <td className="p-4 text-slate-600">{rate.term}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Mortgage Rates */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Home className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-slate-900">Mortgage Rates</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-4 text-slate-700 font-semibold">Product</th>
                  <th className="text-left p-4 text-slate-700 font-semibold">Rate</th>
                  <th className="text-left p-4 text-slate-700 font-semibold">APR</th>
                </tr>
              </thead>
              <tbody>
                {mortgageRates.map((rate) => (
                  <tr key={rate.product} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{rate.product}</td>
                    <td className="p-4 text-blue-600 font-bold text-lg">{rate.rate}</td>
                    <td className="p-4 text-slate-600">{rate.apr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Credit Card Rates */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <CreditCard className="h-8 w-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-slate-900">Credit Card Rates</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {creditCardRates.map((card) => (
              <Card key={card.product} className="border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900">{card.product}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-600 font-bold text-lg mb-2">{card.apr}</p>
                  <p className="text-sm text-slate-600">{card.details}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimers */}
      <section className="py-12 px-4 bg-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-xs text-slate-500 space-y-2">
            <p>
              <strong>APY</strong> = Annual Percentage Yield. APYs are accurate as of March 14, 2026
              and are subject to change without notice. Fees may reduce earnings. A penalty may be
              imposed for early withdrawal on certificates/CDs.
            </p>
            <p>
              <strong>APR</strong> = Annual Percentage Rate. Loan rates are based on
              creditworthiness, loan amount, term, and collateral. All loans are subject to credit
              approval. Rates and terms are subject to change without notice. Membership eligibility
              required.
            </p>
            <p>
              Mortgage rates assume a loan amount of $300,000 with 20% down payment and excellent
              credit. Actual rates may vary. APR reflects the cost of credit as a yearly rate
              including points and closing costs. Contact us for a personalized rate quote.
            </p>
            <p>
              Credit card APRs are variable and based on the Prime Rate plus a margin determined by
              creditworthiness. The Prime Rate as of March 14, 2026 is 7.50%. Rates, fees, and terms
              are subject to change.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-blue-100 mb-8 text-lg">
            Open an account online in minutes and start earning competitive rates today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8"
            >
              <Link to="/open-account">
                Open an Account <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-blue-700 text-lg px-8"
            >
              <Link to="/contact">Talk to an Advisor</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
