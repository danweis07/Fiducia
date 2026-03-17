import { activateDemoMode } from "@/lib/demo";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from 'react-i18next';

// Note: demos array contains display labels defined outside the component.
// These are referenced by translation keys inside the component instead.
const demos = [
  {
    id: "banking",
    titleKey: "demoSelector.demos.banking.title",
    descriptionKey: "demoSelector.demos.banking.description",
    icon: Landmark,
    path: "/dashboard",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    id: "admin",
    titleKey: "demoSelector.demos.admin.title",
    descriptionKey: "demoSelector.demos.admin.description",
    icon: ShieldCheck,
    path: "/admin",
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/40",
  },
] as const;

export default function DemoSelector() {
  const { t } = useTranslation('common');

  const launchDemo = (path: string) => {
    activateDemoMode(path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
              <span className="text-primary-foreground font-bold text-xl">V</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{t('demoSelector.title')}</h1>
            <p className="text-muted-foreground">
              {t('demoSelector.subtitle')}
            </p>
          </div>

          {/* Demo Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {demos.map((demo) => {
              const Icon = demo.icon;
              return (
                <Card
                  key={demo.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => launchDemo(demo.path)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      launchDemo(demo.path);
                    }
                  }}
                >
                  <CardHeader className="flex flex-row items-start gap-4">
                    <div className={`rounded-lg p-2.5 ${demo.bg}`}>
                      <Icon className={`h-6 w-6 ${demo.color}`} />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{t(demo.titleKey)}</CardTitle>
                      <CardDescription>{t(demo.descriptionKey)}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
