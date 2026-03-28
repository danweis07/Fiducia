import { Link } from "react-router-dom";
import { PublicShell } from "@/components/public/PublicShell";
import { SEOHead } from "@/components/public/SEOHead";
import { tenantConfig } from "@/lib/tenant.config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  ShieldAlert,
  Mail,
  Phone,
  MessageSquare,
  FileText,
  AlertTriangle,
  Lock,
  Smartphone,
  Eye,
  Wifi,
  ArrowRight,
  XCircle,
} from "lucide-react";

const neverAsk = [
  "Your full Social Security Number by phone or email",
  "Your complete account number via email or text",
  "Your online banking password or PIN",
  'A wire transfer to "verify" your account',
  "Gift card purchases as a form of payment",
  "Remote access to your computer or device",
];

const scams = [
  {
    icon: Mail,
    title: "Phishing Emails",
    description:
      "Fraudulent emails that appear to come from your credit union asking you to click a link and enter your credentials or personal information.",
    redFlags: [
      "Urgent language demanding immediate action",
      "Misspelled sender addresses or domains",
      "Links that don't match example-cu.org",
      "Requests for personal or account information",
    ],
    action: "Do not click any links. Forward the email to fraud@example-cu.org and delete it.",
  },
  {
    icon: Phone,
    title: "Phone Scams (Vishing)",
    description:
      "Callers impersonating your credit union staff or government agencies, pressuring you to share sensitive information or make immediate payments.",
    redFlags: [
      "Caller demands immediate action or payment",
      "Threats of account closure or legal action",
      "Requests for your PIN or full account number",
      "Spoofed caller ID showing our phone number",
    ],
    action: "Hang up immediately. Call us directly at (800) 555-WOOL to verify.",
  },
  {
    icon: MessageSquare,
    title: "Text Scams (Smishing)",
    description:
      "Fraudulent text messages claiming suspicious activity on your account, with links to fake login pages designed to steal your credentials.",
    redFlags: [
      "Texts from unknown numbers about account issues",
      "Shortened URLs (bit.ly, tinyurl, etc.)",
      "Requests to confirm account details via text",
      "Poor grammar or formatting",
    ],
    action: "Do not reply or click links. Report the text to 7726 (SPAM) and contact us.",
  },
  {
    icon: FileText,
    title: "Check Fraud",
    description:
      "Scammers send fake checks and ask you to deposit them, then wire or send part of the money back before the check bounces.",
    redFlags: [
      "Unexpected check received in the mail",
      "Overpayment for goods or services",
      'Request to wire back "excess" funds',
      "Job offers requiring you to process payments",
    ],
    action: "Do not deposit the check. Contact us and report it to the FTC.",
  },
];

const victimSteps = [
  {
    step: "1",
    title: "Contact Us Immediately",
    description:
      "Call our fraud hotline at (800) 555-FRAU (3728), available 24/7. We will freeze your account, reverse unauthorized transactions where possible, and issue new cards.",
  },
  {
    step: "2",
    title: "File a Police Report",
    description:
      "File a report with your local police department. Keep a copy of the report number for your records — you may need it for disputes and insurance claims.",
  },
  {
    step: "3",
    title: "Place a Fraud Alert on Credit Reports",
    description:
      "Contact one of the three major credit bureaus to place a fraud alert. They are required to notify the other two. Consider a credit freeze for maximum protection.",
  },
  {
    step: "4",
    title: "Monitor Your Accounts",
    description:
      "Review all your financial accounts for suspicious activity. Sign up for transaction alerts and check your credit report regularly at annualcreditreport.com.",
  },
];

const securityTips = [
  {
    icon: Lock,
    title: "Use Strong Passwords",
    description:
      "Create unique passwords of 12+ characters with a mix of letters, numbers, and symbols. Never reuse passwords across accounts.",
  },
  {
    icon: Smartphone,
    title: "Enable Multi-Factor Authentication",
    description:
      "Add an extra layer of security by enabling MFA on your online banking and email accounts.",
  },
  {
    icon: Eye,
    title: "Monitor Statements Regularly",
    description:
      "Review your account statements and transaction history at least weekly. Report any unfamiliar transactions immediately.",
  },
  {
    icon: Wifi,
    title: "Use Secure Wi-Fi",
    description:
      "Avoid accessing your financial accounts on public Wi-Fi networks. Use a VPN or your mobile data connection instead.",
  },
];

export default function FraudPreventionPage() {
  return (
    <PublicShell tenantName={tenantConfig.name}>
      <SEOHead
        title={`Fraud Prevention | ${tenantConfig.name}`}
        description="Learn how to protect yourself from fraud. Recognize common scams, understand security best practices, and know what to do if you're a victim."
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Shield className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Protect Yourself from Fraud</h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Your financial security is our top priority. Learn how to recognize, prevent, and report
            fraud to keep your accounts safe.
          </p>
        </div>
      </section>

      {/* What We'll Never Ask */}
      <section className="py-16 px-4 bg-red-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <ShieldAlert className="h-10 w-10 text-red-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-slate-900 mb-4">What We&apos;ll Never Ask</h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              Your credit union will <strong>never</strong> contact you and ask for the following.
              If someone does, it&apos;s a scam.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {neverAsk.map((item) => (
              <div key={item} className="flex items-center gap-3 bg-white rounded-lg p-4 shadow-sm">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Common Scams */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            Common Scams to Watch For
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Scammers are constantly evolving their tactics. Familiarize yourself with these common
            schemes to stay one step ahead.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {scams.map((scam) => (
              <Card key={scam.title} className="border border-slate-200">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <scam.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg text-slate-900">{scam.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 text-sm mb-4">{scam.description}</p>
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-red-700 mb-2">Red Flags:</p>
                    <ul className="space-y-1">
                      {scam.redFlags.map((flag) => (
                        <li key={flag} className="flex items-start gap-2 text-sm text-slate-600">
                          <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>What to do:</strong> {scam.action}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* If You're a Victim */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-4">
            If You&apos;re a Victim
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-xl mx-auto">
            Act quickly. The sooner you report fraud, the better your chances of recovering funds
            and preventing further damage.
          </p>
          <div className="space-y-6">
            {victimSteps.map((item) => (
              <div
                key={item.step}
                className="flex items-start gap-6 bg-white rounded-xl p-6 shadow-sm"
              >
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-slate-600 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Tips */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Security Best Practices
          </h2>
          <div className="grid sm:grid-cols-2 gap-8">
            {securityTips.map((tip) => (
              <div key={tip.title} className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <tip.icon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{tip.title}</h3>
                  <p className="text-sm text-slate-600">{tip.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Emergency Contacts */}
      <section className="py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
            Emergency Contacts
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border border-slate-200 text-center">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">Fraud Hotline</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-bold text-blue-600">(800) 555-FRAU</p>
                <p className="text-sm text-slate-500">Available 24/7</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 text-center">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">Federal Trade Commission</CardTitle>
              </CardHeader>
              <CardContent>
                <a
                  href="https://reportfraud.ftc.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  reportfraud.ftc.gov
                </a>
                <p className="text-sm text-slate-500 mt-1">File a complaint online</p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 text-center">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">Credit Bureaus</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>Equifax: (800) 525-6285</p>
                  <p>Experian: (888) 397-3742</p>
                  <p>TransUnion: (800) 680-7289</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Need to Report Fraud?</h2>
          <p className="text-blue-100 mb-8 text-lg">
            If you suspect fraudulent activity on your account, don&apos;t wait. Contact us
            immediately so we can help protect your finances.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8"
          >
            <Link to="/contact">
              Report Fraud Now <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
