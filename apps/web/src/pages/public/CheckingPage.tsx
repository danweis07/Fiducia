import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PublicShell } from "@/components/public/PublicShell";
import { SEOHead } from "@/components/public/SEOHead";
import { useCMSPageContent } from "@/hooks/useCMSContent";
import { tenantConfig } from "@/lib/tenant.config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  CreditCard,
  Shield,
  Landmark,
  Wallet,
  GraduationCap,
  Star,
} from "lucide-react";

export default function CheckingPage() {
  const { t } = useTranslation("public");
  const { data: cmsPage } = useCMSPageContent("checking");
  const atmCount = t("terms.atmCount");
  const atmNetworks = t("terms.atmNetworks");
  const rateLabel = t("terms.rateLabel");

  if (cmsPage) {
    return (
      <PublicShell tenantName={tenantConfig.name}>
        <SEOHead
          title={cmsPage.title ?? t("checking.seoTitle", { tenantName: tenantConfig.name })}
          description={t("checking.seoDescription", { atmCount })}
        />
        <article
          className="prose max-w-4xl mx-auto py-12 px-4"
          dangerouslySetInnerHTML={{ __html: cmsPage.body ?? "" }}
        />
      </PublicShell>
    );
  }

  return (
    <PublicShell tenantName={tenantConfig.name}>
      <SEOHead
        title={t("checking.seoTitle", { tenantName: tenantConfig.name })}
        description={t("checking.seoDescription", { atmCount })}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="bg-blue-600 text-white mb-4 text-sm px-4 py-1">
            {t("checking.badge")}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{t("checking.title")}</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            {t("checking.description", { atmCount })}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
              <Link to="/open-account">{t("checking.openAccount")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-slate-400 text-slate-200 hover:bg-slate-800 text-lg px-8"
            >
              <Link to="#compare">{t("checking.compareAccounts")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            {t("checking.whyTitle")}
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                icon: Wallet,
                titleKey: "checking.noMonthlyFees",
                descKey: "checking.noMonthlyFeesDesc",
              },
              {
                icon: Landmark,
                titleKey: "checking.noMinBalance",
                descKey: "checking.noMinBalanceDesc",
              },
              {
                icon: CreditCard,
                titleKey: "checking.freeDebitCard",
                descKey: "checking.freeDebitCardDesc",
              },
              { icon: Shield, titleKey: "checking.freeAtms", descKey: "checking.freeAtmsDesc" },
            ].map((item) => (
              <div key={item.titleKey} className="text-center">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-7 w-7 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  {t(item.titleKey, { atmCount })}
                </h3>
                <p className="text-sm text-slate-600">
                  {t(item.descKey, { atmCount, atmNetworks })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Account Tiers */}
      <section id="compare" className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            {t("checking.compareTitle")}
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            {t("checking.compareDescription")}
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Basic Checking */}
            <Card className="border-2 border-slate-200 hover:border-blue-300 transition-colors">
              <CardHeader className="text-center pb-2">
                <Badge className="w-fit mx-auto bg-green-100 text-green-800 mb-2">
                  {t("checking.mostPopular")}
                </Badge>
                <CardTitle className="text-2xl text-slate-900">
                  {t("checking.basicChecking")}
                </CardTitle>
                <p className="text-4xl font-bold text-blue-600 mt-2">{t("checking.free")}</p>
                <p className="text-sm text-slate-500">{t("checking.noMonthlyFee")}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    t("checking.noMonthlyFees"),
                    t("checking.noMinBalance"),
                    t("checking.freeDebitCard"),
                    t("home.features.mobileBanking"),
                    t("checking.freeAtms", { atmCount }),
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
                  <Link to="/open-account">{t("checking.openAccount")}</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Premium Checking */}
            <Card className="border-2 border-blue-500 shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-4">{t("checking.bestValue")}</Badge>
              </div>
              <CardHeader className="text-center pb-2 pt-8">
                <CardTitle className="text-2xl text-slate-900">
                  {t("checking.premiumChecking")}
                </CardTitle>
                <p className="text-4xl font-bold text-blue-600 mt-2">$0</p>
                <p className="text-sm text-slate-500">
                  {t("checking.withMinBalance", { amount: "$1,500" })}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    `0.10% ${rateLabel}`,
                    t("checking.withMinBalance", { amount: "$1,500" }),
                    t("checking.freeAtms", { atmCount }),
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <Star className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
                  <Link to="/open-account">{t("checking.openAccount")}</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Student Checking */}
            <Card className="border-2 border-slate-200 hover:border-blue-300 transition-colors">
              <CardHeader className="text-center pb-2">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <GraduationCap className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl text-slate-900">
                  {t("checking.studentChecking")}
                </CardTitle>
                <p className="text-4xl font-bold text-blue-600 mt-2">{t("checking.free")}</p>
                <p className="text-sm text-slate-500">Ages 13–24</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    t("checking.noMonthlyFees"),
                    t("checking.noMinBalance"),
                    t("checking.freeDebitCard"),
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
                  <Link to="/open-account">{t("checking.openAccount")}</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">{t("checking.ctaTitle")}</h2>
          <p className="text-blue-100 mb-8 text-lg">{t("checking.ctaDescription")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8"
            >
              <Link to="/open-account">{t("checking.openAccountToday")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-blue-700 text-lg px-8"
            >
              <Link to="/find-us">{t("checking.visitBranch")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
