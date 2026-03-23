import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Plus, Trash2, ArrowRightLeft, Zap, DollarSign, BarChart3 } from "lucide-react";
import {
  useSweepRules,
  useCreateSweepRule,
  useToggleSweepRule,
  useDeleteSweepRule,
  useSweepExecutions,
  useSweepSummary,
} from "@/hooks/useCashSweeps";
import { useAccounts } from "@/hooks/useAccounts";
import { useToast } from "@/hooks/use-toast";
import type { CashSweepRule, SweepFrequency, SweepDirection } from "@/types";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}

export default function CashSweepsPage() {
  const { t } = useTranslation("banking");
  const { toast } = useToast();
  const { data: rulesData, isLoading } = useSweepRules();
  const rules = rulesData?.rules ?? [];
  const { data: summaryData } = useSweepSummary();
  const summary = summaryData?.summary;
  const { data: execData } = useSweepExecutions();
  const executions = execData?.executions ?? [];
  const { data: accountsData } = useAccounts();
  const accounts = accountsData?.accounts ?? [];

  const createRule = useCreateSweepRule();
  const toggleRule = useToggleSweepRule();
  const deleteRule = useDeleteSweepRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formSourceId, setFormSourceId] = useState("");
  const [formDestId, setFormDestId] = useState("");
  const [formThreshold, setFormThreshold] = useState("");
  const [formFrequency, setFormFrequency] = useState<SweepFrequency>("daily");
  const [formDirection, setFormDirection] = useState<SweepDirection>("sweep_out");

  const resetForm = () => {
    setFormName("");
    setFormSourceId("");
    setFormDestId("");
    setFormThreshold("");
    setFormFrequency("daily");
    setFormDirection("sweep_out");
  };

  const handleCreate = () => {
    if (!formName || !formSourceId || !formDestId || !formThreshold) {
      toast({ title: t("cashSweeps.allFieldsRequired"), variant: "destructive" });
      return;
    }
    createRule.mutate(
      {
        name: formName,
        sourceAccountId: formSourceId,
        destinationAccountId: formDestId,
        thresholdCents: Math.round(parseFloat(formThreshold) * 100),
        direction: formDirection,
        frequency: formFrequency,
      },
      {
        onSuccess: () => {
          toast({
            title: t("cashSweeps.sweepRuleCreated"),
            description: t("cashSweeps.sweepRuleCreatedDesc", { name: formName }),
          });
          setDialogOpen(false);
          resetForm();
        },
      },
    );
  };

  return (
    <AppShell>
      <div className="container mx-auto max-w-6xl py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary" />
              {t("cashSweeps.title")}
            </h1>
            <p className="text-muted-foreground mt-1">{t("cashSweeps.subtitle")}</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> {t("cashSweeps.newSweepRule")}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("cashSweeps.activeRules")}</p>
                  <p className="text-2xl font-bold">{summary?.activeRules ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("cashSweeps.totalSwept")}</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(summary?.totalSweptCents ?? 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("cashSweeps.sweepCount")}</p>
                  <p className="text-2xl font-bold">{summary?.totalSweepCount ?? 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-sm text-green-700">{t("cashSweeps.estWeeklyYield")}</p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(summary?.estimatedYieldCents ?? 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rules & Executions Tabs */}
        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">{t("cashSweeps.sweepRules")}</TabsTrigger>
            <TabsTrigger value="history">{t("cashSweeps.executionHistory")}</TabsTrigger>
          </TabsList>

          <TabsContent value="rules">
            <Card>
              <CardHeader>
                <CardTitle>{t("cashSweeps.sweepRules")}</CardTitle>
                <CardDescription>{t("cashSweeps.sweepRulesDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("cashSweeps.loadingRules")}
                  </div>
                ) : rules.length === 0 ? (
                  <div className="text-center py-12">
                    <ArrowRightLeft className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                    <h3 className="text-lg font-semibold">{t("cashSweeps.noRulesYet")}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("cashSweeps.noRulesYetDesc")}
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => {
                        resetForm();
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" /> {t("cashSweeps.createFirstRule")}
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("cashSweeps.ruleName")}</TableHead>
                        <TableHead>{t("cashSweeps.fromTo")}</TableHead>
                        <TableHead>{t("cashSweeps.threshold")}</TableHead>
                        <TableHead>{t("cashSweeps.frequency")}</TableHead>
                        <TableHead>{t("cashSweeps.totalSwept")}</TableHead>
                        <TableHead>{t("cashSweeps.active")}</TableHead>
                        <TableHead className="text-right">{t("cashSweeps.actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((rule: CashSweepRule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">{rule.name}</TableCell>
                          <TableCell>
                            <div className="text-xs">
                              <span>{rule.sourceAccountName}</span>
                              <ArrowRightLeft className="w-3 h-3 inline mx-1" />
                              <span>{rule.destinationAccountName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(rule.thresholdCents)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {t(`cashSweeps.frequency.${rule.frequency}`)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(rule.totalSweptCents)}</TableCell>
                          <TableCell>
                            <Switch
                              checked={rule.status === "active"}
                              onCheckedChange={(checked) =>
                                toggleRule.mutate(
                                  { ruleId: rule.id, status: checked ? "active" : "paused" },
                                  {
                                    onSuccess: () =>
                                      toast({
                                        title: checked
                                          ? t("cashSweeps.ruleActivated")
                                          : t("cashSweeps.rulePaused"),
                                      }),
                                  },
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                deleteRule.mutate(rule.id, {
                                  onSuccess: () => toast({ title: t("cashSweeps.ruleDeleted") }),
                                })
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>{t("cashSweeps.executionHistory")}</CardTitle>
                <CardDescription>{t("cashSweeps.executionHistoryDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                {executions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("cashSweeps.noExecutionsYet")}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("cashSweeps.rule")}</TableHead>
                        <TableHead>{t("cashSweeps.amount")}</TableHead>
                        <TableHead>{t("cashSweeps.fromTo")}</TableHead>
                        <TableHead>{t("cashSweeps.status")}</TableHead>
                        <TableHead>{t("cashSweeps.date")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {executions.map((exec) => (
                        <TableRow key={exec.id}>
                          <TableCell className="font-medium">{exec.ruleName}</TableCell>
                          <TableCell>{formatCurrency(exec.amountCents)}</TableCell>
                          <TableCell className="text-xs">
                            {exec.sourceAccountName}{" "}
                            <ArrowRightLeft className="w-3 h-3 inline mx-1" />{" "}
                            {exec.destinationAccountName}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                exec.status === "completed"
                                  ? "default"
                                  : exec.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {exec.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(exec.executedAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Rule Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("cashSweeps.createSweepRule")}</DialogTitle>
              <DialogDescription>{t("cashSweeps.createSweepRuleDesc")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>{t("cashSweeps.ruleName")}</Label>
                <Input
                  placeholder={t("cashSweeps.ruleNamePlaceholder")}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("cashSweeps.sourceAccount")}</Label>
                  <Select value={formSourceId} onValueChange={setFormSourceId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("cashSweeps.fromPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t("cashSweeps.destinationAccount")}</Label>
                  <Select value={formDestId} onValueChange={setFormDestId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("cashSweeps.toPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a) => a.id !== formSourceId)
                        .map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("cashSweeps.sweepWhenAbove")}</Label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("cashSweeps.frequency")}</Label>
                  <Select
                    value={formFrequency}
                    onValueChange={(v) => setFormFrequency(v as SweepFrequency)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">{t("cashSweeps.realtime")}</SelectItem>
                      <SelectItem value="daily">{t("cashSweeps.daily")}</SelectItem>
                      <SelectItem value="weekly">{t("cashSweeps.weekly")}</SelectItem>
                      <SelectItem value="monthly">{t("cashSweeps.monthly")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t("cashSweeps.direction")}</Label>
                <Select
                  value={formDirection}
                  onValueChange={(v) => setFormDirection(v as SweepDirection)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sweep_out">{t("cashSweeps.sweepOut")}</SelectItem>
                    <SelectItem value="sweep_in">{t("cashSweeps.sweepIn")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cashSweeps.cancel")}
              </Button>
              <Button onClick={handleCreate} disabled={createRule.isPending}>
                {createRule.isPending ? t("cashSweeps.creating") : t("cashSweeps.createRule")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
