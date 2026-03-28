import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { PublicShell } from "@/components/public/PublicShell";
import { SEOHead } from "@/components/public/SEOHead";
import { Button } from "@/components/ui/button";
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Users,
  Wallet,
  Smartphone,
  Landmark,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import type { TenantConfig } from "@/lib/tenant.config";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  faqs: FAQItem[];
}

function buildCategories(config: TenantConfig): FAQCategory[] {
  return [
    {
      id: "membership",
      label: "Membership",
      icon: Users,
      faqs: [
        {
          question: `Who can join ${config.name}?`,
          answer: `${config.eligibility}. Immediate family members of current members are also eligible. A $5 minimum deposit in a savings account establishes your membership.`,
        },
        {
          question: "How do I open an account?",
          answer: `You can open an account online in about 10 minutes, visit any of our ${config.branchCount} branch locations, or call us at ${config.phoneFormatted}. You'll need a valid government-issued photo ID, your Social Security Number, and a $5 minimum deposit for your savings account.`,
        },
        {
          question: "Is there a membership fee?",
          answer:
            "There is a one-time, non-refundable $5 membership fee that serves as your initial savings deposit. This $5 remains in your primary savings account and establishes your ownership share in the credit union. There are no annual membership fees.",
        },
        {
          question: "Can I have a joint account?",
          answer:
            "Yes, you can add a joint owner to any of your accounts. The joint owner must also meet membership eligibility requirements. Both account holders have equal access to the account and can make deposits, withdrawals, and manage the account independently.",
        },
        {
          question: "Do you offer business accounts?",
          answer:
            "Yes, we offer a full suite of business banking products including business checking, savings, money market accounts, business loans, and merchant services. Business accounts require documentation such as your EIN, articles of incorporation, and business license. Visit a branch or call us to get started.",
        },
      ],
    },
    {
      id: "accounts",
      label: "Accounts",
      icon: Wallet,
      faqs: [
        {
          question: "What are the minimum balance requirements?",
          answer:
            "Our Regular Savings requires a $5 minimum balance. Free Checking has no minimum balance requirement. High-Yield Savings requires $500, and Money Market accounts require $2,500 to earn the highest APY tier. There are no monthly maintenance fees on checking or regular savings.",
        },
        {
          question: "Do you offer overdraft protection?",
          answer:
            "Yes, we offer several overdraft protection options. You can link your checking account to a savings account for automatic transfers ($5 transfer fee), set up an overdraft line of credit (interest applies only on amounts used), or opt in to courtesy pay coverage for ATM and debit card transactions ($28 per item, max 4 per day).",
        },
        {
          question: "Do you reimburse ATM fees?",
          answer:
            "Our Premium Checking account reimburses up to $25/month in ATM surcharges charged by other institutions nationwide. Plus, you have surcharge-free access to over 80,000 ATMs through the CO-OP and Allpoint networks. Use our ATM locator on the website or mobile app to find free ATMs near you.",
        },
        {
          question: "Can I get my direct deposit early?",
          answer:
            "Yes! With Early Pay, you can receive your direct deposit up to 2 days early. When your employer sends your paycheck, we make the funds available as soon as we receive the deposit notification — often 1-2 days before your scheduled payday. This feature is automatic for all checking accounts.",
        },
        {
          question: "Can I use my card for international transactions?",
          answer: `Yes, your ${config.shortName} debit and credit cards work internationally wherever Visa is accepted. We charge a 1% foreign transaction fee on debit cards (waived on our Rewards Credit Card). Be sure to set a travel notice before your trip through online banking or our mobile app to prevent your card from being blocked.`,
        },
      ],
    },
    {
      id: "digital",
      label: "Digital Banking",
      icon: Smartphone,
      faqs: [
        {
          question: "How do I enroll in online banking?",
          answer:
            "Visit our website and click \"Enroll\" in the top right corner. You'll need your account number, Social Security Number, and email address. Create a username and password, set up your security questions, and you're in. We recommend enabling two-factor authentication for added security.",
        },
        {
          question: "What are the mobile deposit limits?",
          answer:
            "Standard mobile deposit limits are $2,500 per check and $5,000 per day. Premium Checking members have increased limits of $5,000 per check and $10,000 per day. Business accounts can request custom limits. Deposits made before 4pm ET are typically available the next business day.",
        },
        {
          question: "How do I set up bill pay?",
          answer:
            'Log in to online banking or the mobile app and navigate to "Bill Pay" in the menu. Add payees by entering the company name and your account number. You can schedule one-time payments, set up recurring payments, or use eBills to receive and pay bills electronically. There\'s no fee for this service.',
        },
        {
          question: "Is Zelle available?",
          answer:
            "Yes, Zelle is built directly into our mobile app and online banking. You can send and receive money using just an email address or U.S. mobile phone number. Transfers between enrolled users are typically completed within minutes. There are no fees to send or receive money with Zelle.",
        },
        {
          question: "What browsers are supported for online banking?",
          answer:
            "Our online banking platform supports the latest two versions of Chrome, Firefox, Safari, and Microsoft Edge. We recommend keeping your browser up to date for the best experience and security. Our mobile app is available for iOS 15+ and Android 10+ devices.",
        },
      ],
    },
    {
      id: "loans",
      label: "Loans",
      icon: Landmark,
      faqs: [
        {
          question: "How do I apply for a loan?",
          answer: `You can apply online through our website or mobile app, call us at ${config.phoneFormatted}, or visit any branch. Most applications can be completed in 10-15 minutes. You'll need proof of income, employment information, and details about the purpose of the loan. We typically provide a decision within 24 hours.`,
        },
        {
          question: "Can I get pre-approved for a loan?",
          answer:
            "Yes, we offer pre-approval for auto loans, personal loans, and mortgages. Pre-approval gives you a conditional commitment with a rate and maximum amount, so you can shop with confidence. Pre-approval involves a soft credit pull that does not affect your credit score and is valid for 90 days.",
        },
        {
          question: "Can I have a cosigner on my loan?",
          answer: `Yes, adding a creditworthy cosigner can help you qualify for a loan or receive a better interest rate. The cosigner must be a ${config.shortName} member and will be equally responsible for repaying the loan. Both parties will need to provide income documentation and consent to a credit check.`,
        },
        {
          question: "Can I refinance my existing loan from another lender?",
          answer:
            "Absolutely. We refinance auto loans, personal loans, and mortgages from other financial institutions. Many members save hundreds or even thousands of dollars by refinancing to our lower credit union rates. Apply online and we'll handle the payoff of your existing loan.",
        },
        {
          question: "What payment options are available?",
          answer: `We offer automatic payments from your ${config.shortName} checking or savings account, online payments through our website or app, payments by phone, in-branch payments, and mail-in payments. Setting up automatic payments may qualify you for a 0.25% APR discount on certain loan products.`,
        },
      ],
    },
    {
      id: "security",
      label: "Security",
      icon: ShieldCheck,
      faqs: [
        {
          question: "How is my account protected?",
          answer:
            "Your deposits are federally insured up to $250,000 by the National Credit Union Administration (NCUA). We use 256-bit encryption, multi-factor authentication, real-time fraud monitoring, and automatic session timeouts to protect your online and mobile banking. We also employ 24/7 transaction monitoring systems.",
        },
        {
          question: "What should I do if my card is stolen?",
          answer:
            "Call our card services line immediately, available 24/7. We'll instantly freeze your card to prevent unauthorized use, review recent transactions for fraud, and issue a replacement card. You can also temporarily lock your card through our mobile app while you look for it.",
        },
        {
          question: "How does two-factor authentication work?",
          answer:
            "When you log in from a new device or perform sensitive actions, we'll send a one-time verification code to your registered phone number or email. Enter this code along with your password to verify your identity. You can also use an authenticator app like Google Authenticator or Authy for added convenience.",
        },
        {
          question: "How do I set up fraud alerts?",
          answer:
            "Log in to online banking or the mobile app and go to Settings > Alerts. You can set up real-time notifications for transactions over a certain amount, international transactions, online purchases, card-not-present transactions, and large withdrawals. We recommend enabling all alert types for maximum protection.",
        },
      ],
    },
  ];
}

function AccordionItem({ question, answer }: FAQItem) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-medium text-slate-900 pr-4">{question}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400 flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          <p className="text-slate-600 text-sm leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQsPage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { config } = useSiteConfig();

  const categories = useMemo(() => buildCategories(config), [config]);

  const filteredCategories = activeCategory
    ? categories.filter((c) => c.id === activeCategory)
    : categories;

  return (
    <PublicShell tenantName={config.shortName}>
      <SEOHead
        title={`FAQs | ${config.name}`}
        description={`Find answers to frequently asked questions about membership, accounts, digital banking, loans, and security at ${config.name}.`}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <HelpCircle className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Frequently Asked Questions</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Find quick answers to common questions about your membership, accounts, digital banking,
            loans, and account security.
          </p>
        </div>
      </section>

      {/* Category Filters */}
      <section className="py-8 px-4 bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === null
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Categories
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <category.icon className="h-4 w-4" />
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-12">
          {filteredCategories.map((category) => (
            <div key={category.id}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <category.icon className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{category.label}</h2>
              </div>
              <div className="space-y-3">
                {category.faqs.map((faq) => (
                  <AccordionItem key={faq.question} question={faq.question} answer={faq.answer} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Still have questions CTA */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
          <p className="text-blue-100 mb-8 text-lg">
            Our team is ready to help. Reach out by phone, email, or visit your nearest branch.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8"
            >
              <Link to="/contact">
                Contact Us <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-blue-700 text-lg px-8"
            >
              <Link to="/find-us">Visit a Branch</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
