/**
 * Protected Banking Routes
 *
 * All routes require authentication and are wrapped in the AppShell layout.
 * Feature-gated routes will render NotFound if the feature is disabled.
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Banking pages
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Accounts = lazy(() => import('@/pages/Accounts'));
const AccountDetail = lazy(() => import('@/pages/AccountDetail'));
const LoanDetail = lazy(() => import('@/pages/LoanDetail'));
const Transfer = lazy(() => import('@/pages/Transfer'));
const MoveMoney = lazy(() => import('@/pages/MoveMoney'));
const BillPay = lazy(() => import('@/pages/BillPay'));
const InternationalPayments = lazy(() => import('@/pages/InternationalPayments'));
const Deposit = lazy(() => import('@/pages/Deposit'));
const Cards = lazy(() => import('@/pages/Cards'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Statements = lazy(() => import('@/pages/Statements'));
const Settings = lazy(() => import('@/pages/Settings'));
const LinkedAccounts = lazy(() => import('@/pages/LinkedAccounts'));
const FinancialManagement = lazy(() => import('@/pages/FinancialManagement'));
const CardOffers = lazy(() => import('@/pages/CardOffers'));
const SecureMessages = lazy(() => import('@/pages/SecureMessages'));
const Disputes = lazy(() => import('@/pages/Disputes'));
const CheckOrdering = lazy(() => import('@/pages/CheckOrdering'));
const DirectDeposit = lazy(() => import('@/pages/DirectDeposit'));
const CardServices = lazy(() => import('@/pages/CardServices'));
const DeviceManagement = lazy(() => import('@/pages/DeviceManagement'));
const JointAccounts = lazy(() => import('@/pages/JointAccounts'));
const OverdraftSettings = lazy(() => import('@/pages/OverdraftSettings'));
const SpendingAlerts = lazy(() => import('@/pages/SpendingAlerts'));
const DocumentVault = lazy(() => import('@/pages/DocumentVault'));
const WireTransfer = lazy(() => import('@/pages/WireTransfer'));
const StopPayments = lazy(() => import('@/pages/StopPayments'));
const P2PTransfers = lazy(() => import('@/pages/P2PTransfers'));
const SavingsGoals = lazy(() => import('@/pages/SavingsGoals'));
const LoanApplication = lazy(() => import('@/pages/LoanApplication'));
const OpenBankingConsents = lazy(() => import('@/pages/OpenBankingConsents'));
const KYCAMLCompliance = lazy(() => import('@/pages/KYCAMLCompliance'));
const AutomationRules = lazy(() => import('@/pages/member/AutomationRules'));

// International compliance pages
const InstantPayments = lazy(() => import('@/pages/InstantPayments'));
const ConsentDashboard = lazy(() => import('@/pages/ConsentDashboard'));
const SCAManagement = lazy(() => import('@/pages/SCAManagement'));
const InternationalEKYC = lazy(() => import('@/pages/InternationalEKYC'));
const OpenFinanceHub = lazy(() => import('@/pages/OpenFinanceHub'));

// Business orchestration pages
const AliasPayments = lazy(() => import('@/pages/AliasPayments'));
const MultiCurrencyWallet = lazy(() => import('@/pages/MultiCurrencyWallet'));
const RegulatoryDashboard = lazy(() => import('@/pages/RegulatoryDashboard'));
const BusinessHub = lazy(() => import('@/pages/BusinessHub'));
const InvoiceProcessor = lazy(() => import('@/pages/InvoiceProcessor'));
const CashSweeps = lazy(() => import('@/pages/CashSweeps'));
const JITPermissions = lazy(() => import('@/pages/JITPermissions'));
const LiquidityDashboard = lazy(() => import('@/pages/LiquidityDashboard'));

/**
 * Helper to wrap a page component in an ErrorBoundary.
 */
function eb(Component: React.LazyExoticComponent<() => JSX.Element>) {
  return <ErrorBoundary><Component /></ErrorBoundary>;
}

export function bankingRoutes() {
  return (
    <>
      {/* Core banking */}
      <Route path="/dashboard" element={eb(Dashboard)} />
      <Route path="/accounts" element={eb(Accounts)} />
      <Route path="/accounts/:id" element={eb(AccountDetail)} />
      <Route path="/loans/:id" element={eb(LoanDetail)} />
      <Route path="/transfer" element={eb(Transfer)} />
      <Route path="/move-money" element={eb(MoveMoney)} />
      <Route path="/bills" element={eb(BillPay)} />
      <Route path="/deposit" element={eb(Deposit)} />
      <Route path="/cards" element={eb(Cards)} />
      <Route path="/notifications" element={eb(Notifications)} />
      <Route path="/statements" element={eb(Statements)} />
      <Route path="/settings" element={eb(Settings)} />
      <Route path="/linked-accounts" element={eb(LinkedAccounts)} />
      <Route path="/financial" element={eb(FinancialManagement)} />
      <Route path="/card-offers" element={eb(CardOffers)} />
      <Route path="/messages" element={eb(SecureMessages)} />
      <Route path="/disputes" element={eb(Disputes)} />
      <Route path="/check-ordering" element={eb(CheckOrdering)} />
      <Route path="/direct-deposit" element={eb(DirectDeposit)} />
      <Route path="/card-services" element={eb(CardServices)} />
      <Route path="/devices" element={eb(DeviceManagement)} />
      <Route path="/overdraft" element={eb(OverdraftSettings)} />
      <Route path="/spending-alerts" element={eb(SpendingAlerts)} />
      <Route path="/document-vault" element={eb(DocumentVault)} />
      <Route path="/joint-accounts" element={eb(JointAccounts)} />
      <Route path="/wire-transfer" element={eb(WireTransfer)} />
      <Route path="/stop-payments" element={eb(StopPayments)} />
      <Route path="/p2p" element={eb(P2PTransfers)} />
      <Route path="/savings-goals" element={eb(SavingsGoals)} />
      <Route path="/apply-loan" element={eb(LoanApplication)} />
      <Route path="/automations" element={eb(AutomationRules)} />
      <Route path="/connected-apps" element={eb(OpenBankingConsents)} />
      <Route path="/kyc-aml" element={eb(KYCAMLCompliance)} />

      {/* International & multi-market */}
      <Route path="/international" element={eb(InternationalPayments)} />
      <Route path="/instant-payments" element={eb(InstantPayments)} />
      <Route path="/alias-payments" element={eb(AliasPayments)} />
      <Route path="/multi-currency" element={eb(MultiCurrencyWallet)} />
      <Route path="/regulatory" element={eb(RegulatoryDashboard)} />

      {/* International compliance */}
      <Route path="/consent-dashboard" element={eb(ConsentDashboard)} />
      <Route path="/sca" element={eb(SCAManagement)} />
      <Route path="/international-kyc" element={eb(InternationalEKYC)} />
      <Route path="/open-finance" element={eb(OpenFinanceHub)} />

      {/* Business orchestration */}
      <Route path="/business" element={eb(BusinessHub)} />
      <Route path="/invoices" element={eb(InvoiceProcessor)} />
      <Route path="/cash-sweeps" element={eb(CashSweeps)} />
      <Route path="/approvals" element={eb(JITPermissions)} />
      <Route path="/liquidity" element={eb(LiquidityDashboard)} />
    </>
  );
}
