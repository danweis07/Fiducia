import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Target,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
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
import { formatCurrency } from "@/lib/common/currency";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useAccounts } from "@/hooks/useAccounts";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import {
  useSavingsGoals,
  useCreateSavingsGoal,
  useDeleteSavingsGoal,
  useContributeToGoal,
  useWithdrawFromGoal,
  useGoalSummary,
} from "@/hooks/useSavingsGoals";
import type { SavingsGoal } from "@/types";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SavingsGoals() {
  const { t } = useTranslation("banking");
  const [createOpen, setCreateOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<SavingsGoal | null>(null);
  const [withdrawGoal, setWithdrawGoal] = useState<SavingsGoal | null>(null);
  const [amount, setAmount] = useState("");

  // Create form state
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [goalAccount, setGoalAccount] = useState("");
  const [goalEmoji, setGoalEmoji] = useState("");
  const [autoContribute, setAutoContribute] = useState(false);
  const [autoAmount, setAutoAmount] = useState("");
  const [autoFreq, setAutoFreq] = useState<"weekly" | "biweekly" | "monthly">("monthly");

  const { data: goalsData, isLoading } = useSavingsGoals();
  const { data: summaryData } = useGoalSummary();
  const { data: accountsData } = useAccounts();
  const createGoal = useCreateSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();
  const contribute = useContributeToGoal();
  const withdraw = useWithdrawFromGoal();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const goals = goalsData?.goals ?? [];
  const summary = summaryData?.summary;
  const accounts = accountsData?.accounts ?? [];
  const savingsAccounts = accounts.filter((a) => a.status === "active");

  const resetCreateForm = () => {
    setGoalName("");
    setGoalTarget("");
    setGoalDate("");
    setGoalAccount("");
    setGoalEmoji("");
    setAutoContribute(false);
    setAutoAmount("");
    setAutoFreq("monthly");
  };

  const handleCreate = async () => {
    const targetCents = Math.round(parseFloat(goalTarget) * 100);
    if (!goalName || !targetCents || targetCents <= 0 || !goalAccount) {
      toast({ title: t("savingsGoals.fillRequiredFields"), variant: "destructive" });
      return;
    }
    try {
      await createGoal.mutateAsync({
        name: goalName,
        targetAmountCents: targetCents,
        accountId: goalAccount,
        targetDate: goalDate || undefined,
        iconEmoji: goalEmoji || undefined,
        autoContribute,
        autoContributeAmountCents:
          autoContribute && autoAmount ? Math.round(parseFloat(autoAmount) * 100) : undefined,
        autoContributeFrequency: autoContribute ? autoFreq : undefined,
      });
      toast({ title: t("savingsGoals.goalCreated") });
      resetCreateForm();
      setCreateOpen(false);
    } catch (e) {
      handleError(e);
    }
  };

  const handleContribute = async () => {
    if (!contributeGoal) return;
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      toast({ title: t("savingsGoals.invalidAmount"), variant: "destructive" });
      return;
    }
    try {
      await contribute.mutateAsync({ goalId: contributeGoal.id, amountCents: cents });
      toast({
        title: t("savingsGoals.contributionAdded"),
        description: t("savingsGoals.contributionAddedDesc", {
          amount: formatCurrency(cents),
          name: contributeGoal.name,
        }),
      });
      setAmount("");
      setContributeGoal(null);
    } catch (e) {
      handleError(e);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawGoal) return;
    const cents = Math.round(parseFloat(amount) * 100);
    if (!cents || cents <= 0) {
      toast({ title: t("savingsGoals.invalidAmount"), variant: "destructive" });
      return;
    }
    try {
      await withdraw.mutateAsync({ goalId: withdrawGoal.id, amountCents: cents });
      toast({
        title: t("savingsGoals.withdrawalCompleted"),
        description: t("savingsGoals.withdrawalCompletedDesc", {
          amount: formatCurrency(cents),
          name: withdrawGoal.name,
        }),
      });
      setAmount("");
      setWithdrawGoal(null);
    } catch (e) {
      handleError(e);
    }
  };

  const handleDelete = async (goal: SavingsGoal) => {
    try {
      await deleteGoal.mutateAsync(goal.id);
      toast({
        title: t("savingsGoals.goalDeleted"),
        description: t("savingsGoals.goalDeletedDesc", { name: goal.name }),
      });
    } catch (e) {
      handleError(e);
    }
  };

  if (isLoading)
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );

  return (
    <AppShell>
      <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("savingsGoals.title")}</h1>
            <p className="text-muted-foreground">{t("savingsGoals.subtitle")}</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("savingsGoals.newGoal")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("savingsGoals.createGoal")}</DialogTitle>
                <DialogDescription>{t("savingsGoals.createGoalDesc")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-[1fr_60px] gap-2">
                  <div className="space-y-2">
                    <Label>{t("savingsGoals.goalName")}</Label>
                    <Input
                      value={goalName}
                      onChange={(e) => setGoalName(e.target.value)}
                      placeholder={t("savingsGoals.goalNamePlaceholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("savingsGoals.icon")}</Label>
                    <Input
                      value={goalEmoji}
                      onChange={(e) => setGoalEmoji(e.target.value)}
                      placeholder="🏖"
                      maxLength={2}
                      className="text-center text-lg"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("savingsGoals.targetAmount")}</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    placeholder="5000.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("savingsGoals.targetDate")}</Label>
                  <Input
                    type="date"
                    value={goalDate}
                    onChange={(e) => setGoalDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("savingsGoals.savingsAccount")}</Label>
                  <Select value={goalAccount} onValueChange={setGoalAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("savingsGoals.selectAccount")} />
                    </SelectTrigger>
                    <SelectContent>
                      {savingsAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nickname ?? a.type} ({a.accountNumberMasked})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={autoContribute} onCheckedChange={setAutoContribute} />
                  <Label>{t("savingsGoals.autoContribute")}</Label>
                </div>
                {autoContribute && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>{t("savingsGoals.amountDollar")}</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={autoAmount}
                        onChange={(e) => setAutoAmount(e.target.value)}
                        placeholder="100.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("savingsGoals.frequency")}</Label>
                      <Select
                        value={autoFreq}
                        onValueChange={(v) => setAutoFreq(v as "weekly" | "biweekly" | "monthly")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">{t("savingsGoals.weekly")}</SelectItem>
                          <SelectItem value="biweekly">{t("savingsGoals.biweekly")}</SelectItem>
                          <SelectItem value="monthly">{t("savingsGoals.monthly")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  {t("savingsGoals.cancel")}
                </Button>
                <Button onClick={handleCreate} disabled={createGoal.isPending}>
                  {createGoal.isPending
                    ? t("savingsGoals.creating")
                    : t("savingsGoals.createGoalBtn")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-sm text-muted-foreground">{t("savingsGoals.totalSaved")}</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalSavedCents)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-sm text-muted-foreground">{t("savingsGoals.activeGoals")}</p>
                <p className="text-2xl font-bold">{summary.activeGoals}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 flex items-center gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">{t("savingsGoals.onTrack")}</p>
                  <p className="text-2xl font-bold text-green-600">{summary.onTrackCount}</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 flex items-center gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">{t("savingsGoals.behind")}</p>
                  <p className="text-2xl font-bold text-amber-600">{summary.behindCount}</p>
                </div>
                <AlertCircle className="h-5 w-5 text-amber-500 ml-auto" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Goals Grid */}
        {goals.length === 0 ? (
          <EmptyState
            icon={<Target className="h-10 w-10" />}
            title={t("savingsGoals.noGoals")}
            description={t("savingsGoals.noGoalsDesc")}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <Card key={goal.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {goal.iconEmoji && <span className="text-2xl">{goal.iconEmoji}</span>}
                      <div>
                        <CardTitle className="text-base">{goal.name}</CardTitle>
                        <CardDescription>{goal.accountMasked}</CardDescription>
                      </div>
                    </div>
                    <Badge
                      variant={
                        goal.status === "active"
                          ? "default"
                          : goal.status === "completed"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {goal.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{formatCurrency(goal.currentAmountCents)}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(goal.targetAmountCents)}
                      </span>
                    </div>
                    <Progress value={goal.progressPercent} className="h-2" />
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">
                        {t("savingsGoals.percentComplete", { percent: goal.progressPercent })}
                      </span>
                      {goal.targetDate && (
                        <span className="text-xs text-muted-foreground">
                          by {new Date(goal.targetDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  {goal.status === "active" && goal.targetDate && (
                    <div className="flex items-center gap-1 text-xs">
                      {goal.isOnTrack ? (
                        <>
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-green-600">{t("savingsGoals.onTrack")}</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                          <span className="text-amber-600">{t("savingsGoals.behindSchedule")}</span>
                        </>
                      )}
                    </div>
                  )}
                  {goal.autoContribute && goal.autoContributeAmountCents && (
                    <p className="text-xs text-muted-foreground">
                      Auto: {formatCurrency(goal.autoContributeAmountCents)}{" "}
                      {goal.autoContributeFrequency}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {goal.status === "active" && (
                      <>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setContributeGoal(goal);
                            setAmount("");
                          }}
                        >
                          <ArrowUpRight className="h-3 w-3 mr-1" />
                          {t("savingsGoals.add")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => {
                            setWithdrawGoal(goal);
                            setAmount("");
                          }}
                          disabled={goal.currentAmountCents === 0}
                        >
                          <ArrowDownLeft className="h-3 w-3 mr-1" />
                          {t("savingsGoals.withdraw")}
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleDelete(goal)}
                      disabled={deleteGoal.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Contribute Dialog */}
        <Dialog open={!!contributeGoal} onOpenChange={(o) => !o && setContributeGoal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("savingsGoals.addTo", { name: contributeGoal?.name })}</DialogTitle>
              <DialogDescription>
                {t("savingsGoals.currentOfTarget", {
                  current: contributeGoal ? formatCurrency(contributeGoal.currentAmountCents) : "",
                  target: contributeGoal ? formatCurrency(contributeGoal.targetAmountCents) : "",
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>{t("savingsGoals.amountDollar")}</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setContributeGoal(null)}>
                {t("savingsGoals.cancel")}
              </Button>
              <Button onClick={handleContribute} disabled={contribute.isPending}>
                {contribute.isPending ? t("savingsGoals.adding") : t("savingsGoals.addFunds")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Withdraw Dialog */}
        <Dialog open={!!withdrawGoal} onOpenChange={(o) => !o && setWithdrawGoal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {t("savingsGoals.withdrawFrom", { name: withdrawGoal?.name })}
              </DialogTitle>
              <DialogDescription>
                {t("savingsGoals.available", {
                  amount: withdrawGoal ? formatCurrency(withdrawGoal.currentAmountCents) : "",
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>{t("savingsGoals.amountDollar")}</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWithdrawGoal(null)}>
                {t("savingsGoals.cancel")}
              </Button>
              <Button onClick={handleWithdraw} disabled={withdraw.isPending}>
                {withdraw.isPending ? t("savingsGoals.withdrawing") : t("savingsGoals.withdraw")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </AppShell>
  );
}
