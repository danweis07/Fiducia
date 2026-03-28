import { Link } from "react-router-dom";
import { PublicShell } from "@/components/public/PublicShell";
import { SEOHead } from "@/components/public/SEOHead";
import { tenantConfig } from "@/lib/tenant.config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Star,
  Percent,
  Shield,
  Gift,
  Fuel,
  UtensilsCrossed,
  CheckCircle,
} from "lucide-react";

export default function CreditCardsPage() {
  return (
    <PublicShell tenantName={tenantConfig.name}>
      <SEOHead
        title={`Credit Cards | ${tenantConfig.name}`}
        description={`Earn rewards, cash back, or enjoy a low rate. ${tenantConfig.shortName} Visa credit cards with no annual fee, fraud protection, and competitive rates.`}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="bg-blue-600 text-white mb-4 text-sm px-4 py-1">No Annual Fee</Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Credit Cards That Reward You</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            From earning rewards on everyday purchases to saving with a low rate, find the card that
            fits the way you spend.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
              <Link to="/open-account">Apply Now</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-slate-400 text-slate-200 hover:bg-slate-800 text-lg px-8"
            >
              <Link to="/card-offers">View All Card Offers</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Card Products */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">Choose Your Card</h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            {`Every ${tenantConfig.shortName} Visa card`} comes with no annual fee, EMV chip
            security, contactless pay, and 24/7 fraud monitoring.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Rewards Visa */}
            <Card className="border-2 border-blue-500 shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-4">Most Popular</Badge>
              </div>
              <CardHeader className="pt-8 text-center">
                <div className="w-full h-40 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex flex-col items-center justify-center text-white mb-4 shadow-md">
                  <CreditCard className="h-10 w-10 mb-2" />
                  <p className="font-bold text-lg">{tenantConfig.shortName} Rewards Visa</p>
                  <p className="text-blue-200 text-sm">Visa Signature</p>
                </div>
                <CardTitle className="text-xl text-slate-900">Rewards Visa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg">
                    <UtensilsCrossed className="h-5 w-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">2% back on dining</p>
                      <p className="text-xs text-slate-500">Restaurants, takeout, delivery</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg">
                    <Fuel className="h-5 w-5 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">2% back on gas</p>
                      <p className="text-xs text-slate-500">Gas stations & EV charging</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                    <Gift className="h-5 w-5 text-slate-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">1% on everything else</p>
                      <p className="text-xs text-slate-500">No caps, no category limits</p>
                    </div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> No annual fee
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> 0% intro APR for 12 months
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> 13.99% – 21.99% variable APR
                    after
                  </li>
                </ul>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link to="/open-account">Apply Now</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Cash Back */}
            <Card className="border-2 border-slate-200 hover:border-blue-300 transition-colors">
              <CardHeader className="text-center">
                <div className="w-full h-40 bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl flex flex-col items-center justify-center text-white mb-4 shadow-md">
                  <CreditCard className="h-10 w-10 mb-2" />
                  <p className="font-bold text-lg">{tenantConfig.shortName} Cash Back</p>
                  <p className="text-slate-300 text-sm">Visa Platinum</p>
                </div>
                <CardTitle className="text-xl text-slate-900">Cash Back</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center">
                  <p className="text-3xl font-bold text-green-700">1.5%</p>
                  <p className="text-sm text-green-600 font-medium">
                    Unlimited cash back on every purchase
                  </p>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> No annual fee
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> No category tracking needed
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> 0% intro APR for 15 months
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> 12.99% – 22.99% variable APR
                    after
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Cash back redeemable anytime
                  </li>
                </ul>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link to="/open-account">Apply Now</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Low Rate */}
            <Card className="border-2 border-slate-200 hover:border-blue-300 transition-colors">
              <CardHeader className="text-center">
                <div className="w-full h-40 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl flex flex-col items-center justify-center text-white mb-4 shadow-md">
                  <CreditCard className="h-10 w-10 mb-2" />
                  <p className="font-bold text-lg">{tenantConfig.shortName} Low Rate</p>
                  <p className="text-emerald-200 text-sm">Visa Platinum</p>
                </div>
                <CardTitle className="text-xl text-slate-900">Low Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-center">
                  <p className="text-3xl font-bold text-blue-700">8.99%</p>
                  <p className="text-sm text-blue-600 font-medium">
                    Variable APR — one of the lowest around
                  </p>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 mb-6">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> No annual fee
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> Ideal for balance transfers
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> 0% balance transfer APR for
                    12 months
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> No balance transfer fee
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" /> 8.99% – 17.99% variable APR
                  </li>
                </ul>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link to="/open-account">Apply Now</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* All Cards Benefits */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">
            {`Every ${tenantConfig.shortName} Card Includes`}
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {
                icon: Shield,
                title: "Zero Liability",
                desc: "Fraud protection on unauthorized purchases",
              },
              { icon: Star, title: "No Annual Fee", desc: "Keep your card without yearly charges" },
              {
                icon: Percent,
                title: "Competitive Rates",
                desc: "Lower rates than most national banks",
              },
              {
                icon: CreditCard,
                title: "Contactless Pay",
                desc: "Tap to pay with EMV chip technology",
              },
            ].map((benefit) => (
              <div key={benefit.title} className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <benefit.icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-1">{benefit.title}</h3>
                <p className="text-sm text-slate-600">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Find the Right Card for You</h2>
          <p className="text-blue-100 mb-8 text-lg">
            Apply online in minutes with an instant decision. Start earning rewards or saving on
            interest today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8"
            >
              <Link to="/open-account">Apply Now</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-blue-700 text-lg px-8"
            >
              <Link to="/card-offers">View All Card Offers</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
