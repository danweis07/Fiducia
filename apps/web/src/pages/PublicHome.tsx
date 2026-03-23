import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PublicShell } from "@/components/public/PublicShell";
import { SEOHead } from "@/components/public/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Shield,
  Smartphone,
  Zap,
  PiggyBank,
  CreditCard,
  Building2,
  TrendingUp,
  Users,
  Star,
  CheckCircle2,
  Phone,
} from "lucide-react";
import { MobileAppBanner } from "@/components/public/MobileAppBanner";
import { StructuredData } from "@/components/public/StructuredData";

const featureKeys = [
  { icon: Shield, titleKey: "home.features.security", descKey: "home.features.securityDesc" },
  {
    icon: Smartphone,
    titleKey: "home.features.mobileBanking",
    descKey: "home.features.mobileBankingDesc",
  },
  {
    icon: Zap,
    titleKey: "home.features.instantTransfers",
    descKey: "home.features.instantTransfersDesc",
  },
  {
    icon: PiggyBank,
    titleKey: "home.features.competitiveRates",
    descKey: "home.features.competitiveRatesDesc",
  },
  {
    icon: CreditCard,
    titleKey: "home.features.rewardsCards",
    descKey: "home.features.rewardsCardsDesc",
  },
  { icon: Building2, titleKey: "home.features.freeAtms", descKey: "home.features.freeAtmsDesc" },
];

// Rates would typically come from CMS/backend — these are placeholders
const rates = [
  { product: "High-Yield Savings", rate: "4.25", unitKey: "terms.rateLabel", badge: "Popular" },
  { product: "12-Month Certificate", rate: "5.00", unitKey: "terms.rateLabel", badge: "Best Rate" },
  { product: "New Auto Loan", rate: "5.24", unitKey: "terms.loanRateLabel", badge: null },
  { product: "30-Year Mortgage", rate: "6.375", unitKey: "terms.loanRateLabel", badge: null },
];

const stats = [
  { value: "175,000+", labelKey: "home.stats.members" },
  { value: "$3.2B", labelKey: "home.stats.inAssets" },
  { value: "23", labelKey: "home.stats.branches" },
  { value: "70+", labelKey: "home.stats.yearsServing" },
];

const testimonials = [
  {
    name: "Maria S.",
    location: "King of Prussia, PA",
    quote:
      "Switching to this credit union was the best financial decision I've made. The savings rates are unbeatable and the mobile app is fantastic.",
    rating: 5,
  },
  {
    name: "James T.",
    location: "Cherry Hill, NJ",
    quote:
      "Got my auto loan approved in under an hour with an incredible rate. The staff at the Cherry Hill branch went above and beyond.",
    rating: 5,
  },
  {
    name: "Priya K.",
    location: "Wilmington, DE",
    quote:
      "I love that my credit union is not-for-profit. Lower fees, better rates, and they actually care about the community.",
    rating: 5,
  },
];

export default function PublicHome() {
  const { t } = useTranslation("public");
  return (
    <PublicShell tenantName="Demo Credit Union">
      <SEOHead
        title="Demo Credit Union - Banking That Puts You First"
        description="Join 175,000+ members at Demo Credit Union. Free checking, high-yield savings up to 5.00% APY, low-rate loans, and 85,000+ surcharge-free ATMs. Federally insured by NCUA."
      />
      <StructuredData
        type="CreditUnion"
        data={{
          name: "Demo Credit Union",
          description:
            "Not-for-profit financial cooperative serving communities nationwide since 1952.",
          url: "https://www.example-cu.org",
          foundingDate: "1952",
          numberOfEmployees: "850",
          areaServed: ["United States"],
        }}
      />
      <MobileAppBanner />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30 mb-6">
                {t("home.heroBadge")}
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
                {t("home.heroTitle")}{" "}
                <span className="text-blue-300">{t("home.heroHighlight")}</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-blue-100 leading-relaxed max-w-xl">
                {t("home.heroDescription")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/open-account">
                  <Button
                    size="lg"
                    className="bg-white text-slate-900 hover:bg-blue-50 gap-2 text-base"
                  >
                    {t("home.openAccount")} <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 text-base"
                  >
                    {t("home.signIn")}
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex items-center gap-4 text-sm text-blue-200">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> {t("home.noMonthlyFees")}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> {t("home.ncuaInsured")}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> {t("home.freeAtms")}
                </span>
              </div>
            </div>

            {/* Rates preview card */}
            <div className="hidden lg:block">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20 text-white">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-300" />
                    {t("home.todaysTopRates")}
                  </h3>
                  <div className="space-y-3">
                    {rates.map((rate) => (
                      <div
                        key={rate.product}
                        className="flex items-center justify-between py-2 border-b border-white/10 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-blue-100">{rate.product}</span>
                          {rate.badge && (
                            <Badge
                              variant="secondary"
                              className="bg-blue-500/30 text-blue-200 text-[10px] px-1.5"
                            >
                              {rate.badge}
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold">{rate.rate}%</span>
                          <span className="text-xs text-blue-200 ml-1">{t(rate.unitKey)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link to="/savings" className="block mt-4">
                    <Button
                      variant="outline"
                      className="w-full border-white/30 text-white hover:bg-white/10 text-sm"
                    >
                      {t("home.viewAllRates")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-blue-600 text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((stat) => (
              <div key={stat.labelKey}>
                <p className="text-2xl md:text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-blue-100">{t(stat.labelKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Quick Links */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {t("home.productsTitle")}
            </h2>
            <p className="mt-3 text-lg text-slate-500 max-w-2xl mx-auto">
              {t("home.productsDescription")}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              {
                icon: CreditCard,
                labelKey: "home.products.checking",
                href: "/checking",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: PiggyBank,
                labelKey: "home.products.savingsCds",
                href: "/savings",
                color: "bg-green-50 text-green-600",
              },
              {
                icon: CreditCard,
                labelKey: "home.products.creditCards",
                href: "/credit-cards",
                color: "bg-purple-50 text-purple-600",
              },
              {
                icon: Building2,
                labelKey: "home.products.mortgages",
                href: "/mortgages",
                color: "bg-amber-50 text-amber-600",
              },
              {
                icon: Zap,
                labelKey: "home.products.autoLoans",
                href: "/auto-loans",
                color: "bg-red-50 text-red-600",
              },
              {
                icon: Users,
                labelKey: "home.products.personalLoans",
                href: "/loans",
                color: "bg-teal-50 text-teal-600",
              },
            ].map((item) => (
              <Link
                key={item.labelKey}
                to={item.href}
                className="flex flex-col items-center gap-3 p-5 rounded-xl hover:shadow-md transition-shadow border border-slate-100 hover:border-slate-200"
              >
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center ${item.color}`}
                >
                  <item.icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-medium text-slate-700">{t(item.labelKey)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {t("home.whyChooseUsTitle")}
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
              {t("home.whyChooseUsDescription")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureKeys.map((feature) => (
              <Card
                key={feature.titleKey}
                className="border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{t(feature.descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              {t("home.testimonialsTitle")}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((review) => (
              <Card key={review.name} className="border shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed italic mb-4">
                    &ldquo;{review.quote}&rdquo;
                  </p>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{review.name}</p>
                    <p className="text-xs text-slate-500">{review.location}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">{t("home.ctaTitle")}</h2>
          <p className="mt-4 text-lg text-blue-100">{t("home.ctaDescription")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/open-account">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 gap-2 text-base">
                {t("home.openAccount")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/find-us">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 text-base"
              >
                {t("home.findBranch")}
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-sm text-blue-200 flex items-center justify-center gap-2">
            <Phone className="h-4 w-4" />
            {t("home.questionsCallUs")}
          </p>
        </div>
      </section>
    </PublicShell>
  );
}
