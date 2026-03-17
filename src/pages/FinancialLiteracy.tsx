import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, BookOpen, Search, ExternalLink, Filter } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FINANCIAL_RESOURCES, GLOSSARY_TERMS } from "@/lib/financial-literacy-data";
import type { LiteracyCategory } from "@/types/financial-literacy";

const CATEGORY_LABELS: Record<LiteracyCategory, string> = {
  budgeting: "Budgeting",
  saving: "Saving",
  credit: "Credit",
  loans: "Loans",
  investing: "Investing",
  fraud_prevention: "Fraud Prevention",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-green-100 text-green-800",
  intermediate: "bg-yellow-100 text-yellow-800",
  advanced: "bg-red-100 text-red-800",
};

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as LiteracyCategory[];

export default function FinancialLiteracy() {
  const { t } = useTranslation('banking');
  const [resourceSearch, setResourceSearch] = useState("");
  const [glossarySearch, setGlossarySearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<LiteracyCategory | "all">("all");

  const filteredResources = useMemo(() => {
    return FINANCIAL_RESOURCES.filter((resource) => {
      const matchesCategory =
        selectedCategory === "all" || resource.category === selectedCategory;
      const query = resourceSearch.toLowerCase();
      const matchesSearch =
        !query ||
        resource.title.toLowerCase().includes(query) ||
        resource.description.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [resourceSearch, selectedCategory]);

  const filteredTerms = useMemo(() => {
    const query = glossarySearch.toLowerCase();
    if (!query) return GLOSSARY_TERMS;
    return GLOSSARY_TERMS.filter(
      (t) =>
        t.term.toLowerCase().includes(query) ||
        t.definition.toLowerCase().includes(query)
    );
  }, [glossarySearch]);

  const groupedTerms = useMemo(() => {
    const groups: Record<string, typeof filteredTerms> = {};
    for (const term of filteredTerms) {
      const letter = term.term[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(term);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTerms]);

  const handleRelatedTermClick = (term: string) => {
    setGlossarySearch(term);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('financialLiteracy.title')}</h1>
            <p className="text-muted-foreground">
              {t('financialLiteracy.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resources" className="space-y-6">
        <TabsList>
          <TabsTrigger value="resources" className="gap-2">
            <BookOpen className="h-4 w-4" />
            {t('financialLiteracy.resources')}
          </TabsTrigger>
          <TabsTrigger value="glossary" className="gap-2">
            <Search className="h-4 w-4" />
            {t('financialLiteracy.glossary')}
          </TabsTrigger>
        </TabsList>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          {/* Category filters */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>{t('financialLiteracy.filterByCategory')}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedCategory === "all" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory("all")}
              >
                {t('financialLiteracy.all')}
              </Badge>
              {ALL_CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {CATEGORY_LABELS[cat]}
                </Badge>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('financialLiteracy.searchResourcesPlaceholder')}
              value={resourceSearch}
              onChange={(e) => setResourceSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Resource cards */}
          {filteredResources.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {t('financialLiteracy.noResources')}
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base leading-snug">
                      {resource.title}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {resource.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {resource.source}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[resource.category]}
                      </Badge>
                      <Badge
                        className={`text-xs ${DIFFICULTY_COLORS[resource.difficulty]}`}
                        variant="secondary"
                      >
                        {resource.difficulty}
                      </Badge>
                    </div>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      {t('financialLiteracy.visit')}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Glossary Tab */}
        <TabsContent value="glossary" className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('financialLiteracy.searchTermsPlaceholder')}
              value={glossarySearch}
              onChange={(e) => setGlossarySearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Alphabetical sections */}
          {groupedTerms.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              {t('financialLiteracy.noTerms')}
            </p>
          ) : (
            <div className="space-y-8">
              {groupedTerms.map(([letter, terms]) => (
                <div key={letter}>
                  <h2 className="mb-3 border-b pb-1 text-lg font-semibold text-primary">
                    {letter}
                  </h2>
                  <div className="space-y-4">
                    {terms.map((item) => (
                      <div key={item.term} className="space-y-1">
                        <h3 className="font-medium">{item.term}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.definition}
                        </p>
                        {item.relatedTerms && item.relatedTerms.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="text-xs text-muted-foreground">{t('financialLiteracy.related')}:</span>
                            {item.relatedTerms.map((related) => (
                              <Badge
                                key={related}
                                variant="outline"
                                className="cursor-pointer text-xs"
                                onClick={() => handleRelatedTermClick(related)}
                              >
                                {related}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
