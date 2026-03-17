import { useState, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, TrendingUp, DollarSign, PiggyBank, CreditCard, Landmark } from "lucide-react";
import {
  compoundInterestWithContributions,
  loanPayment,
  cdMaturity,
  debtPayoff,
  savingsGoal,
} from "@/lib/common/calculators";
import { formatCurrency, formatInterestRate } from "@/lib/common/currency";

function dollarsToCents(dollarStr: string): number {
  const val = parseFloat(dollarStr);
  if (isNaN(val) || val < 0) return 0;
  return Math.round(val * 100);
}

function percentToBps(percentStr: string): number {
  const val = parseFloat(percentStr);
  if (isNaN(val) || val < 0) return 0;
  return Math.round(val * 100);
}

function parsePositiveInt(str: string): number {
  const val = parseInt(str, 10);
  if (isNaN(val) || val < 0) return 0;
  return val;
}

function SavingsGrowthTab() {
  const { t } = useTranslation('banking');
  const [initialDeposit, setInitialDeposit] = useState("10000");
  const [monthlyContribution, setMonthlyContribution] = useState("500");
  const [annualRate, setAnnualRate] = useState("4.25");
  const [years, setYears] = useState("10");

  const result = useMemo(() => {
    const principalCents = dollarsToCents(initialDeposit);
    const monthlyCents = dollarsToCents(monthlyContribution);
    const rateBps = percentToBps(annualRate);
    const yrs = parsePositiveInt(years);
    if (yrs === 0) return null;

    const futureValueCents = compoundInterestWithContributions(principalCents, monthlyCents, rateBps, yrs);
    const totalContributionsCents = principalCents + monthlyCents * yrs * 12;
    const interestEarnedCents = futureValueCents - totalContributionsCents;

    return { futureValueCents, totalContributionsCents, interestEarnedCents };
  }, [initialDeposit, monthlyContribution, annualRate, years]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            {t('calculators.savingsGrowth')}
          </CardTitle>
          <CardDescription>
            {t('calculators.savingsGrowthDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sg-initial">{t('calculators.initialDeposit')}</Label>
            <Input id="sg-initial" type="number" min="0" step="100" value={initialDeposit} onChange={(e) => setInitialDeposit(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-monthly">{t('calculators.monthlyContribution')}</Label>
            <Input id="sg-monthly" type="number" min="0" step="50" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-rate">{t('calculators.annualInterestRate')}</Label>
            <Input id="sg-rate" type="number" min="0" step="0.25" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-years">{t('calculators.timePeriodYears')}</Label>
            <Input id="sg-years" type="number" min="1" max="50" step="1" value={years} onChange={(e) => setYears(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('calculators.results')}</CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('calculators.futureValue')}</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(result.futureValueCents)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('calculators.totalContributions')}</p>
                  <p className="text-xl font-semibold">{formatCurrency(result.totalContributionsCents)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('calculators.interestEarned')}</p>
                  <p className="text-xl font-semibold text-green-600">{formatCurrency(result.interestEarnedCents)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('calculators.rate')}</p>
                <p className="text-base">{formatInterestRate(percentToBps(annualRate))} {t('calculators.annually')}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">{t('calculators.enterValidInputs')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LoanPaymentTab() {
  const { t } = useTranslation('banking');
  const [loanAmount, setLoanAmount] = useState("250000");
  const [annualRate, setAnnualRate] = useState("6.50");
  const [termYears, setTermYears] = useState("30");

  const result = useMemo(() => {
    const principalCents = dollarsToCents(loanAmount);
    const rateBps = percentToBps(annualRate);
    const months = parsePositiveInt(termYears) * 12;
    if (principalCents === 0 || months === 0) return null;

    const monthlyPaymentCents = loanPayment(principalCents, rateBps, months);
    const totalPaidCents = monthlyPaymentCents * months;
    const totalInterestCents = totalPaidCents - principalCents;

    return { monthlyPaymentCents, totalPaidCents, totalInterestCents };
  }, [loanAmount, annualRate, termYears]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Landmark className="h-5 w-5" />
            {t('calculators.loanPayment')}
          </CardTitle>
          <CardDescription>
            {t('calculators.loanPaymentDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lp-amount">{t('calculators.loanAmount')}</Label>
            <Input id="lp-amount" type="number" min="0" step="1000" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lp-rate">{t('calculators.annualInterestRate')}</Label>
            <Input id="lp-rate" type="number" min="0" step="0.25" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lp-term">{t('calculators.loanTermYears')}</Label>
            <Select value={termYears} onValueChange={setTermYears}>
              <SelectTrigger id="lp-term">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">{t('calculators.nYears', { count: 10 })}</SelectItem>
                <SelectItem value="15">{t('calculators.nYears', { count: 15 })}</SelectItem>
                <SelectItem value="20">{t('calculators.nYears', { count: 20 })}</SelectItem>
                <SelectItem value="25">{t('calculators.nYears', { count: 25 })}</SelectItem>
                <SelectItem value="30">{t('calculators.nYears', { count: 30 })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('calculators.results')}</CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('calculators.monthlyPayment')}</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(result.monthlyPaymentCents)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('calculators.totalPaid')}</p>
                  <p className="text-xl font-semibold">{formatCurrency(result.totalPaidCents)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('calculators.totalInterest')}</p>
                  <p className="text-xl font-semibold text-orange-600">{formatCurrency(result.totalInterestCents)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('calculators.rate')}</p>
                <p className="text-base">{formatInterestRate(percentToBps(annualRate))} {t('calculators.annually')}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">{t('calculators.enterValidInputs')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CdMaturityTab() {
  const { t } = useTranslation('banking');
  const [deposit, setDeposit] = useState("10000");
  const [annualRate, setAnnualRate] = useState("5.00");
  const [termMonths, setTermMonths] = useState("12");

  const result = useMemo(() => {
    const principalCents = dollarsToCents(deposit);
    const rateBps = percentToBps(annualRate);
    const months = parsePositiveInt(termMonths);
    if (principalCents === 0 || months === 0) return null;

    return cdMaturity(principalCents, rateBps, months);
  }, [deposit, annualRate, termMonths]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5" />
            {t('calculators.cdMaturity')}
          </CardTitle>
          <CardDescription>
            {t('calculators.cdMaturityDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cd-deposit">{t('calculators.depositAmount')}</Label>
            <Input id="cd-deposit" type="number" min="0" step="500" value={deposit} onChange={(e) => setDeposit(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cd-rate">{t('calculators.annualRateApy')}</Label>
            <Input id="cd-rate" type="number" min="0" step="0.25" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cd-term">{t('calculators.term')}</Label>
            <Select value={termMonths} onValueChange={setTermMonths}>
              <SelectTrigger id="cd-term">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">{t('calculators.nMonths', { count: 3 })}</SelectItem>
                <SelectItem value="6">{t('calculators.nMonths', { count: 6 })}</SelectItem>
                <SelectItem value="12">{t('calculators.nMonths', { count: 12 })}</SelectItem>
                <SelectItem value="18">{t('calculators.nMonths', { count: 18 })}</SelectItem>
                <SelectItem value="24">{t('calculators.nMonths', { count: 24 })}</SelectItem>
                <SelectItem value="36">{t('calculators.nMonths', { count: 36 })}</SelectItem>
                <SelectItem value="48">{t('calculators.nMonths', { count: 48 })}</SelectItem>
                <SelectItem value="60">{t('calculators.nMonths', { count: 60 })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('calculators.results')}</CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('calculators.maturityValue')}</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(result.maturityValueCents)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('calculators.interestEarned')}</p>
                <p className="text-xl font-semibold text-green-600">{formatCurrency(result.interestEarnedCents)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('calculators.rate')}</p>
                <p className="text-base">{formatInterestRate(percentToBps(annualRate))} {t('calculators.apy')}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">{t('calculators.enterValidInputs')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DebtPayoffTab() {
  const { t } = useTranslation('banking');
  const [balance, setBalance] = useState("5000");
  const [annualRate, setAnnualRate] = useState("18.99");
  const [monthlyPayment, setMonthlyPayment] = useState("200");

  const result = useMemo(() => {
    const balanceCents = dollarsToCents(balance);
    const rateBps = percentToBps(annualRate);
    const paymentCents = dollarsToCents(monthlyPayment);
    if (balanceCents === 0 || paymentCents === 0) return null;

    const payoff = debtPayoff(balanceCents, rateBps, paymentCents);
    return payoff;
  }, [balance, annualRate, monthlyPayment]);

  const isInfinite = result && !isFinite(result.months);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            {t('calculators.debtPayoff')}
          </CardTitle>
          <CardDescription>
            {t('calculators.debtPayoffDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dp-balance">{t('calculators.currentBalance')}</Label>
            <Input id="dp-balance" type="number" min="0" step="100" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dp-rate">{t('calculators.annualInterestRate')}</Label>
            <Input id="dp-rate" type="number" min="0" step="0.25" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dp-payment">{t('calculators.monthlyPayment')}</Label>
            <Input id="dp-payment" type="number" min="0" step="25" value={monthlyPayment} onChange={(e) => setMonthlyPayment(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('calculators.results')}</CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            isInfinite ? (
              <div className="space-y-2">
                <p className="text-lg font-semibold text-destructive">{t('calculators.paymentTooLow')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('calculators.paymentTooLowDesc')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('calculators.timeToPayOff')}</p>
                  <p className="text-3xl font-bold text-primary">
                    {result.months >= 12
                      ? t('calculators.yearsAndMonths', { years: Math.floor(result.months / 12), months: result.months % 12 })
                      : t('calculators.nMonths', { count: result.months })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('calculators.totalInterestPaid')}</p>
                  <p className="text-xl font-semibold text-orange-600">{formatCurrency(result.totalInterestCents)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('calculators.rate')}</p>
                  <p className="text-base">{formatInterestRate(percentToBps(annualRate))} {t('calculators.annually')}</p>
                </div>
              </div>
            )
          ) : (
            <p className="text-muted-foreground">{t('calculators.enterValidInputs')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SavingsGoalTab() {
  const { t } = useTranslation('banking');
  const [goal, setGoal] = useState("25000");
  const [annualRate, setAnnualRate] = useState("4.00");
  const [months, setMonths] = useState("36");

  const result = useMemo(() => {
    const goalCents = dollarsToCents(goal);
    const rateBps = percentToBps(annualRate);
    const mo = parsePositiveInt(months);
    if (goalCents === 0 || mo === 0) return null;

    const monthlyNeededCents = savingsGoal(goalCents, rateBps, mo);
    const totalContributionsCents = monthlyNeededCents * mo;
    const interestEarnedCents = goalCents - totalContributionsCents;

    return { monthlyNeededCents, totalContributionsCents, interestEarnedCents };
  }, [goal, annualRate, months]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <PiggyBank className="h-5 w-5" />
            {t('calculators.savingsGoal')}
          </CardTitle>
          <CardDescription>
            {t('calculators.savingsGoalDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sg2-goal">{t('calculators.savingsGoalAmount')}</Label>
            <Input id="sg2-goal" type="number" min="0" step="500" value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg2-rate">{t('calculators.annualInterestRate')}</Label>
            <Input id="sg2-rate" type="number" min="0" step="0.25" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg2-months">{t('calculators.timeFrameMonths')}</Label>
            <Input id="sg2-months" type="number" min="1" max="600" step="1" value={months} onChange={(e) => setMonths(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('calculators.results')}</CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('calculators.monthlySavingsNeeded')}</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(result.monthlyNeededCents)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('calculators.totalContributions')}</p>
                  <p className="text-xl font-semibold">{formatCurrency(result.totalContributionsCents)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('calculators.interestEarned')}</p>
                  <p className="text-xl font-semibold text-green-600">{formatCurrency(result.interestEarnedCents)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('calculators.rate')}</p>
                <p className="text-base">{formatInterestRate(percentToBps(annualRate))} {t('calculators.annually')}</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">{t('calculators.enterValidInputs')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Calculators() {
  const { t } = useTranslation('banking');
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Calculator className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('calculators.title')}</h1>
          <p className="text-muted-foreground">{t('calculators.subtitle')}</p>
        </div>
      </div>

      <Tabs defaultValue="savings-growth" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="savings-growth" className="gap-1.5">
            <TrendingUp className="h-4 w-4" />
            {t('calculators.savingsGrowth')}
          </TabsTrigger>
          <TabsTrigger value="loan-payment" className="gap-1.5">
            <Landmark className="h-4 w-4" />
            {t('calculators.loanPayment')}
          </TabsTrigger>
          <TabsTrigger value="cd-maturity" className="gap-1.5">
            <DollarSign className="h-4 w-4" />
            {t('calculators.cdMaturity')}
          </TabsTrigger>
          <TabsTrigger value="debt-payoff" className="gap-1.5">
            <CreditCard className="h-4 w-4" />
            {t('calculators.debtPayoff')}
          </TabsTrigger>
          <TabsTrigger value="savings-goal" className="gap-1.5">
            <PiggyBank className="h-4 w-4" />
            {t('calculators.savingsGoal')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="savings-growth">
          <SavingsGrowthTab />
        </TabsContent>
        <TabsContent value="loan-payment">
          <LoanPaymentTab />
        </TabsContent>
        <TabsContent value="cd-maturity">
          <CdMaturityTab />
        </TabsContent>
        <TabsContent value="debt-payoff">
          <DebtPayoffTab />
        </TabsContent>
        <TabsContent value="savings-goal">
          <SavingsGoalTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
