import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Zap,
  Plus,
  Pause,
  Play,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppShell } from "@/components/AppShell";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import { Spinner } from "@/components/common/Spinner";
import { EmptyState } from "@/components/common/EmptyState";

export default function AutomationRules() {
  const { t } = useTranslation('banking');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [ruleText, setRuleText] = useState("");

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ["ai-platform", "automation", "rules"],
    queryFn: () => gateway.aiPlatform.automation.listRules(),
  });

  const createRule = useMutation({
    mutationFn: (params: { description: string }) =>
      gateway.aiPlatform.automation.createRule(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-platform", "automation", "rules"] });
      setCreateOpen(false);
      setRuleText("");
      toast({ title: t('automationRules.ruleCreated'), description: t('automationRules.ruleCreatedDesc') });
    },
    onError: () => {
      toast({ title: t('automationRules.failedToCreateRule'), variant: "destructive" });
    },
  });

  const toggleRule = useMutation({
    mutationFn: (params: { ruleId: string; active: boolean }) =>
      gateway.aiPlatform.automation.toggleRule(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-platform", "automation", "rules"] });
    },
    onError: () => {
      toast({ title: t('automationRules.failedToUpdateRule'), variant: "destructive" });
    },
  });

  const deleteRule = useMutation({
    mutationFn: (ruleId: string) =>
      gateway.aiPlatform.automation.deleteRule({ ruleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-platform", "automation", "rules"] });
      toast({ title: t('automationRules.ruleDeleted') });
    },
    onError: () => {
      toast({ title: t('automationRules.failedToDeleteRule'), variant: "destructive" });
    },
  });

  const rules = rulesData?.rules ?? [];

  return (
    <AppShell>
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{t('automationRules.title')}</h2>
              <p className="text-muted-foreground">
                {t('automationRules.subtitle')}
              </p>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('automationRules.createRule')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {t('automationRules.createSmartAutomation')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('automationRules.createSmartAutomationDesc')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="rule-text">{t('automationRules.yourRule')}</Label>
                    <Textarea
                      id="rule-text"
                      placeholder={t('automationRules.rulePlaceholder')}
                      value={ruleText}
                      onChange={(e) => setRuleText(e.target.value)}
                      rows={6}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('automationRules.ruleExamples')}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCreateOpen(false);
                      setRuleText("");
                    }}
                  >
                    {t('automationRules.cancel')}
                  </Button>
                  <Button
                    onClick={() => createRule.mutate({ description: ruleText })}
                    disabled={!ruleText.trim() || createRule.isPending}
                  >
                    {createRule.isPending ? t('automationRules.creating') : t('automationRules.createRule')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : rules.length === 0 ? (
            <EmptyState
              icon={Zap}
              title={t('automationRules.noAutomationsYet')}
              description={t('automationRules.noAutomationsYetDesc')}
            />
          ) : (
            <div className="grid gap-4">
              {rules.map((rule) => (
                <Card key={rule.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <Zap className={`h-5 w-5 mt-0.5 shrink-0 ${rule.active ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="min-w-0">
                          <CardTitle className="text-base">{rule.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {rule.description}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={rule.active ? "default" : "outline"}>
                        {rule.active ? t('automationRules.active') : t('automationRules.paused')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {t('automationRules.executed', { count: rule.executionCount })}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            toggleRule.mutate({
                              ruleId: rule.id,
                              active: !rule.active,
                            })
                          }
                          disabled={toggleRule.isPending}
                        >
                          {rule.active ? (
                            <>
                              <Pause className="h-4 w-4 mr-1" />
                              {t('automationRules.pause')}
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4 mr-1" />
                              {t('automationRules.resume')}
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteRule.mutate(rule.id)}
                          disabled={deleteRule.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {t('automationRules.delete')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </AppShell>
  );
}
