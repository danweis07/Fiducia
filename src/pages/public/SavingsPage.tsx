import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PublicShell } from '@/components/public/PublicShell';
import { SEOHead } from '@/components/public/SEOHead';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Shield, PiggyBank, Clock, Landmark, ArrowRight } from 'lucide-react';

export default function SavingsPage() {
  const { t } = useTranslation('public');
  const rateLabel = t('terms.rateLabel');
  const insuranceBody = t('terms.depositInsuranceBody');
  const insuranceLimit = t('terms.depositInsuranceLimit');

  return (
    <PublicShell tenantName="Demo Credit Union">
      <SEOHead
        title={t('savings.seoTitle', { tenantName: 'Demo Credit Union' })}
        description={t('savings.seoDescription', { topRate: '5.00%', rateLabel })}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="bg-green-600 text-white mb-4 text-sm px-4 py-1">
            {t('savings.badge', { topRate: '5.00%', rateLabel })}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">{t('savings.title')}</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
            {t('savings.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
              <Link to="/open-account">{t('savings.openSavingsAccount')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-400 text-slate-200 hover:bg-slate-800 text-lg px-8">
              <Link to="/calculators">{t('savings.calculateEarnings')}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Deposit Insurance Badge */}
      <section className="py-6 px-4 bg-green-50 border-b border-green-200">
        <div className="max-w-5xl mx-auto flex items-center justify-center gap-3">
          <Shield className="h-6 w-6 text-green-700" />
          <p className="text-green-800 font-medium text-center">
            {t('savings.depositInsurance', { insuranceBody, insuranceLimit })}
          </p>
        </div>
      </section>

      {/* Savings Products */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">{t('savings.savingsTitle')}</h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            {t('savings.savingsDescription')}
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Regular Savings */}
            <Card className="border-2 border-slate-200 hover:border-blue-300 transition-colors">
              <CardHeader className="text-center">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <PiggyBank className="h-7 w-7 text-blue-600" />
                </div>
                <CardTitle className="text-xl text-slate-900">{t('savings.regularSavings')}</CardTitle>
                <p className="text-4xl font-bold text-blue-600 mt-2">0.45%</p>
                <p className="text-sm text-slate-500">{rateLabel}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-700 mb-6">
                  <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-500" /> $5 minimum to open</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-500" /> No monthly fees</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-500" /> Dividends paid monthly</li>
                </ul>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link to="/open-account">{t('savings.openAccount')}</Link>
                </Button>
              </CardContent>
            </Card>

            {/* High-Yield Savings */}
            <Card className="border-2 border-blue-500 shadow-lg relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600 text-white px-4">{t('savings.bestRate')}</Badge>
              </div>
              <CardHeader className="text-center pt-8">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="h-7 w-7 text-blue-600" />
                </div>
                <CardTitle className="text-xl text-slate-900">{t('savings.highYieldSavings')}</CardTitle>
                <p className="text-4xl font-bold text-blue-600 mt-2">4.25%</p>
                <p className="text-sm text-slate-500">{rateLabel}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-700 mb-6">
                  <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-500" /> $500 minimum to open</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-500" /> No monthly fees</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-500" /> Dividends compounded daily</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-500" /> Unlimited deposits</li>
                </ul>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link to="/open-account">{t('savings.openAccount')}</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Money Market */}
            <Card className="border-2 border-slate-200 hover:border-blue-300 transition-colors">
              <CardHeader className="text-center">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Landmark className="h-7 w-7 text-blue-600" />
                </div>
                <CardTitle className="text-xl text-slate-900">{t('savings.moneyMarket')}</CardTitle>
                <p className="text-4xl font-bold text-blue-600 mt-2">4.50%</p>
                <p className="text-sm text-slate-500">{rateLabel}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-700 mb-6">
                  <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-500" /> $2,500 minimum to open</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-500" /> Check-writing privileges</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-500" /> Tiered dividend rates</li>
                  <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-blue-500" /> ATM/debit card access</li>
                </ul>
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link to="/open-account">{t('savings.openAccount')}</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Certificates / CDs */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">{t('savings.certificatesTitle')}</h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            {t('savings.certificatesDescription')}
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { term: '12-Month', apy: '5.00%', min: '$500', highlight: true },
              { term: '6-Month', apy: '4.75%', min: '$500', highlight: false },
              { term: '3-Month', apy: '4.25%', min: '$500', highlight: false },
            ].map((cd) => (
              <Card
                key={cd.term}
                className={`text-center ${cd.highlight ? 'border-2 border-blue-500 shadow-lg' : 'border border-slate-200'}`}
              >
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-lg text-slate-900">{cd.term} {t('savings.certificate')}</CardTitle>
                  {cd.highlight && <Badge className="w-fit mx-auto bg-green-100 text-green-800">{t('savings.bestRate')}</Badge>}
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-blue-600 mb-1">{cd.apy}</p>
                  <p className="text-sm text-slate-500 mb-1">{rateLabel}</p>
                  <p className="text-sm text-slate-600 mb-4">{t('savings.minimumDeposit', { amount: cd.min })}</p>
                  <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                    <Link to="/open-account">{t('savings.openCertificate')}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">{t('savings.ctaTitle')}</h2>
          <p className="text-blue-100 mb-8 text-lg">
            {t('savings.ctaDescription')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8">
              <Link to="/open-account">{t('savings.openSavingsAccount')}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-blue-700 text-lg px-8">
              <Link to="/calculators">{t('savings.calculateEarnings')}</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
