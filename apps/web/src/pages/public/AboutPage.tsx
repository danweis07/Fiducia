import { Link } from "react-router-dom";
import { PublicShell } from "@/components/public/PublicShell";
import { SEOHead } from "@/components/public/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSiteConfig } from "@/hooks/useSiteConfig";

const values = [
  {
    title: "Member-First",
    description:
      "As a not-for-profit cooperative, our earnings are returned to members through better rates, lower fees, and enhanced services.",
  },
  {
    title: "Community Commitment",
    description:
      "We invest $2.5M+ annually in charitable giving, local partnerships, and programs that strengthen the communities we serve.",
  },
  {
    title: "Innovation",
    description:
      "From mobile banking to AI-powered financial insights, we continuously invest in technology that makes managing your money easier.",
  },
  {
    title: "Inclusion",
    description:
      "Through financial literacy programs, accessible banking products, and multilingual support, we ensure everyone has a path to financial wellness.",
  },
];

const leadership = [
  { name: "Sarah Chen", title: "Chief Executive Officer" },
  { name: "Marcus Williams", title: "Chief Financial Officer" },
  { name: "Rachel Kim", title: "Chief Operating Officer" },
  { name: "David Okafor", title: "Chief Technology Officer" },
];

export default function AboutPage() {
  const { config } = useSiteConfig();
  const yearsServing = new Date().getFullYear() - config.foundedYear;

  const stats = [
    { label: "Members", value: config.memberCount },
    { label: "Branches", value: String(config.branchCount) },
    { label: "Assets", value: config.totalAssets },
    { label: "Employees", value: config.employeeCount },
    { label: "Years Serving Community", value: `${yearsServing}+` },
  ];

  return (
    <PublicShell>
      <SEOHead
        title={`About Us - ${config.name}`}
        description={`Learn about ${config.name} — serving the ${config.serviceArea} community since ${config.foundedYear} with ${config.memberCount} members and ${config.totalAssets} in assets.`}
      />

      {/* Hero */}
      <section className="bg-blue-900 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About {config.name}</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Founded in {config.foundedYear}, we have been proudly serving our community for over{" "}
            {yearsServing} years — putting members first in everything we do.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Story</h2>
          <div className="space-y-4 text-slate-600 text-lg leading-relaxed">
            <p>
              {config.name} began in {config.foundedYear} as a small credit union in {config.city},{" "}
              {config.state}. A group of community members pooled their savings with a simple goal:
              to provide affordable financial services for their fellow neighbors and families.
            </p>
            <p>
              Over the decades, we expanded our charter to serve the broader {config.serviceArea}{" "}
              community. What started as a small cooperative has grown into a full-service financial
              institution with {config.branchCount} branches across {config.serviceArea}.
            </p>
            <p>
              Today, {config.name} serves more than {config.memberCount} members and manages over{" "}
              {config.totalAssets} in assets. While we have grown significantly, our founding
              principle remains the same: people helping people.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-slate-50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-6">Our Mission</h2>
          <blockquote className="text-xl md:text-2xl text-blue-800 font-medium italic leading-relaxed">
            &ldquo;To empower our members&apos; financial well-being through personalized service,
            innovative solutions, and community investment.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* Values */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">Our Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((value) => (
              <Card key={value.title} className="border-l-4 border-l-blue-600">
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{value.title}</h3>
                  <p className="text-slate-600">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* By The Numbers */}
      <section className="bg-blue-900 text-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 text-center">By The Numbers</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-bold text-blue-200 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-blue-300 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">
            Executive Leadership
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {leadership.map((person) => (
              <Card key={person.name} className="text-center">
                <CardContent className="p-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">
                      {person.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{person.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{person.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Community Impact */}
      <section className="bg-slate-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-6 text-center">Community Impact</h2>
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <h3 className="text-2xl font-semibold text-blue-800 mb-4">
              The {config.shortName} Foundation
            </h3>
            <p className="text-slate-600 text-lg mb-6">
              The {config.shortName} Foundation is the philanthropic arm of our credit union.
              Through the Foundation, we channel our commitment to the communities we serve into
              meaningful action.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700 mb-1">$18M+</div>
                <p className="text-slate-600 text-sm">
                  In scholarships awarded to local students since 1998
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700 mb-1">500+</div>
                <p className="text-slate-600 text-sm">
                  Small business grants provided to entrepreneurs in underserved communities
                </p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-700 mb-1">12,000+</div>
                <p className="text-slate-600 text-sm">
                  Employee volunteer hours contributed annually to local organizations
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Ready to Join the {config.shortName} Family?
          </h2>
          <p className="text-slate-600 text-lg mb-8">
            Experience the credit union difference. Better rates, lower fees, and a team that
            genuinely cares about your financial success.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-blue-700 hover:bg-blue-800">
              <Link to="/open-account">Join {config.shortName}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/find-us">Find a Branch</Link>
            </Button>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
