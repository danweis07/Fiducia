/**
 * Public Routes — No auth required
 *
 * Marketing pages, auth entry points, and CMS pages.
 */

import { lazy } from 'react';
import { Route } from 'react-router-dom';

// Auth entry points (eagerly loaded)
import Auth from '@/pages/Auth';
import ResetPassword from '@/pages/ResetPassword';
import DemoSelector from '@/pages/DemoSelector';
import NotFound from '@/pages/NotFound';

// Public pages
const PublicHome = lazy(() => import('@/pages/PublicHome'));
const PublicPage = lazy(() => import('@/pages/PublicPage'));
const FindUs = lazy(() => import('@/pages/FindUs'));
const AccountOpening = lazy(() => import('@/pages/AccountOpening'));
const DigitalActivation = lazy(() => import('@/pages/DigitalActivation'));
const FinancialLiteracy = lazy(() => import('@/pages/FinancialLiteracy'));
const Calculators = lazy(() => import('@/pages/Calculators'));

// Product pages
const CheckingPage = lazy(() => import('@/pages/public/CheckingPage'));
const SavingsPage = lazy(() => import('@/pages/public/SavingsPage'));
const CreditCardsPage = lazy(() => import('@/pages/public/CreditCardsPage'));
const AutoLoansPage = lazy(() => import('@/pages/public/AutoLoansPage'));
const MortgagePage = lazy(() => import('@/pages/public/MortgagePage'));
const LoansPage = lazy(() => import('@/pages/public/LoansPage'));

// Credit union pages
const AboutPage = lazy(() => import('@/pages/public/AboutPage'));
const CareersPage = lazy(() => import('@/pages/public/CareersPage'));
const CommunityPage = lazy(() => import('@/pages/public/CommunityPage'));
const ScholarshipsPage = lazy(() => import('@/pages/public/ScholarshipsPage'));

// Resource pages
const RatesPage = lazy(() => import('@/pages/public/RatesPage'));
const FraudPreventionPage = lazy(() => import('@/pages/public/FraudPreventionPage'));
const FAQsPage = lazy(() => import('@/pages/public/FAQsPage'));
const ContactPage = lazy(() => import('@/pages/public/ContactPage'));

export function publicRoutes() {
  return (
    <>
      {/* Homepage & CMS */}
      <Route path="/" element={<PublicHome />} />
      <Route path="/home" element={<PublicHome />} />
      <Route path="/p/:slug" element={<PublicPage />} />
      <Route path="/demo" element={<DemoSelector />} />

      {/* Products */}
      <Route path="/checking" element={<CheckingPage />} />
      <Route path="/savings" element={<SavingsPage />} />
      <Route path="/credit-cards" element={<CreditCardsPage />} />
      <Route path="/auto-loans" element={<AutoLoansPage />} />
      <Route path="/mortgages" element={<MortgagePage />} />
      <Route path="/loans" element={<LoansPage />} />

      {/* Resources */}
      <Route path="/learn" element={<FinancialLiteracy />} />
      <Route path="/calculators" element={<Calculators />} />
      <Route path="/rates" element={<RatesPage />} />
      <Route path="/fraud-prevention" element={<FraudPreventionPage />} />
      <Route path="/faqs" element={<FAQsPage />} />

      {/* Credit union */}
      <Route path="/about" element={<AboutPage />} />
      <Route path="/careers" element={<CareersPage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="/scholarships" element={<ScholarshipsPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* Locations & account actions */}
      <Route path="/find-us" element={<FindUs />} />
      <Route path="/open-account" element={<AccountOpening />} />
      <Route path="/activate" element={<DigitalActivation />} />

      {/* Auth */}
      <Route path="/auth" element={<Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </>
  );
}
