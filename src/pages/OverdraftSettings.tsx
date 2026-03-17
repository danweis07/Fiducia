import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, DollarSign, AlertTriangle, History } from "lucide-react";
import { useAccounts } from "@/hooks/useAccounts";
import { useOverdraftSettings, useUpdateOverdraftSettings, useOverdraftHistory, useOverdraftFeeSchedule } from "@/hooks/useOverdraft";
import { useToast } from "@/hooks/use-toast";
import type { OverdraftProtectionType } from "@/types";

export default function OverdraftSettingsPage() {
  const { t } = useTranslation('banking');
  const { toast } = useToast();
  const { data: accountsData } = useAccounts();
  const accounts = accountsData?.accounts ?? [];
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");

  const { data: settingsData, isLoading: loadingSettings } = useOverdraftSettings(selectedAccountId || undefined);
  const settings = settingsData?.settings;
  const updateSettings = useUpdateOverdraftSettings();
  const { data: historyData } = useOverdraftHistory(selectedAccountId || undefined);
  const events = historyData?.events ?? [];
  const { data: feeData } = useOverdraftFeeSchedule();
  const feeSchedule = feeData?.feeSchedule ?? [];

  const [isEnabled, setIsEnabled] = useState(false);
  const [protectionType, setProtectionType] = useState<OverdraftProtectionType>("transfer");
  const [linkedAccountId, setLinkedAccountId] = useState("");
  const [courtesyPayLimit, setCourtesyPayLimit] = useState("");
  const [optedIntoFees, setOptedIntoFees] = useState(false);

  const applySettings = () => {
    if (settings) {
      setIsEnabled(settings.isEnabled);
      setProtectionType(settings.protectionType ?? "transfer");
      setLinkedAccountId(settings.linkedAccountId ?? "");
      setCourtesyPayLimit(settings.courtesyPayLimitCents ? (settings.courtesyPayLimitCents / 100).toString() : "");
      setOptedIntoFees(settings.optedIntoOverdraftFees);
    }
  };

  // Apply settings when they load
  const prevAccountRef = useState<string>("");
  if (settings && selectedAccountId !== prevAccountRef[0]) {
    prevAccountRef[0] = selectedAccountId;
    applySettings();
  }

  const handleSave = () => {
    if (!selectedAccountId) return;
    updateSettings.mutate({
      accountId: selectedAccountId,
      isEnabled,
      protectionType: isEnabled ? protectionType : null,
      linkedAccountId: protectionType === "transfer" ? linkedAccountId || null : null,
      courtesyPayLimitCents: protectionType === "courtesy_pay" && courtesyPayLimit ? Math.round(parseFloat(courtesyPayLimit) * 100) : null,
      optedIntoOverdraftFees: optedIntoFees,
    }, {
      onSuccess: () => toast({ title: t('overdraftSettings.settingsSaved'), description: t('overdraftSettings.settingsSavedDesc') }),
      onError: () => toast({ title: t('overdraftSettings.error'), description: t('overdraftSettings.failedToSave'), variant: "destructive" }),
    });
  };

  const formatCents = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const otherAccounts = accounts.filter(a => a.id !== selectedAccountId && a.status === "active");

  return (
    <AppShell>
      <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            {t('overdraftSettings.title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('overdraftSettings.subtitle')}</p>
        </div>

        {/* Account Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('overdraftSettings.selectAccount')}</CardTitle>
            <CardDescription>{t('overdraftSettings.selectAccountDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-full md:w-80">
                <SelectValue placeholder={t('overdraftSettings.selectAnAccount')} />
              </SelectTrigger>
              <SelectContent>
                {accounts.filter(a => a.status === "active").map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.nickname || account.type} - {account.accountNumberMasked}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedAccountId && !loadingSettings && (
          <>
            {/* Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('overdraftSettings.protectionSettings')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="overdraft-toggle" className="text-base font-medium">{t('overdraftSettings.enableProtection')}</Label>
                    <p className="text-sm text-muted-foreground">{t('overdraftSettings.enableProtectionDesc')}</p>
                  </div>
                  <Switch id="overdraft-toggle" checked={isEnabled} onCheckedChange={setIsEnabled} />
                </div>

                {isEnabled && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <Label className="text-base font-medium">{t('overdraftSettings.protectionType')}</Label>
                      <RadioGroup value={protectionType} onValueChange={(v) => setProtectionType(v as OverdraftProtectionType)}>
                        <div className="flex items-start gap-3 p-3 rounded-lg border">
                          <RadioGroupItem value="transfer" id="type-transfer" className="mt-0.5" />
                          <div>
                            <Label htmlFor="type-transfer" className="font-medium">{t('overdraftSettings.linkedAccountTransfer')}</Label>
                            <p className="text-sm text-muted-foreground">{t('overdraftSettings.linkedAccountTransferDesc')}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg border">
                          <RadioGroupItem value="line_of_credit" id="type-loc" className="mt-0.5" />
                          <div>
                            <Label htmlFor="type-loc" className="font-medium">{t('overdraftSettings.lineOfCredit')}</Label>
                            <p className="text-sm text-muted-foreground">{t('overdraftSettings.lineOfCreditDesc')}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg border">
                          <RadioGroupItem value="courtesy_pay" id="type-courtesy" className="mt-0.5" />
                          <div>
                            <Label htmlFor="type-courtesy" className="font-medium">{t('overdraftSettings.courtesyPay')}</Label>
                            <p className="text-sm text-muted-foreground">{t('overdraftSettings.courtesyPayDesc')}</p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>

                    {protectionType === "transfer" && (
                      <div className="space-y-2">
                        <Label>{t('overdraftSettings.linkedAccount')}</Label>
                        <Select value={linkedAccountId} onValueChange={setLinkedAccountId}>
                          <SelectTrigger className="w-full md:w-80">
                            <SelectValue placeholder={t('overdraftSettings.selectLinkedAccount')} />
                          </SelectTrigger>
                          <SelectContent>
                            {otherAccounts.map(account => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.nickname || account.type} - {account.accountNumberMasked}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {protectionType === "courtesy_pay" && (
                      <div className="space-y-2">
                        <Label htmlFor="courtesy-limit">{t('overdraftSettings.courtesyPayLimit')}</Label>
                        <Input
                          id="courtesy-limit"
                          type="number"
                          min="0"
                          step="0.01"
                          value={courtesyPayLimit}
                          onChange={e => setCourtesyPayLimit(e.target.value)}
                          className="w-full md:w-48"
                          placeholder="500.00"
                        />
                      </div>
                    )}

                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="fee-optin" className="text-base font-medium">{t('overdraftSettings.optIntoFees')}</Label>
                        <p className="text-sm text-muted-foreground">{t('overdraftSettings.optIntoFeesDesc')}</p>
                      </div>
                      <Switch id="fee-optin" checked={optedIntoFees} onCheckedChange={setOptedIntoFees} />
                    </div>
                  </>
                )}

                <div className="pt-4">
                  <Button onClick={handleSave} disabled={updateSettings.isPending}>
                    {updateSettings.isPending ? t('overdraftSettings.saving') : t('overdraftSettings.saveSettings')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Fee Schedule */}
            {feeSchedule.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5" /> {t('overdraftSettings.feeSchedule')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('overdraftSettings.feeType')}</TableHead>
                        <TableHead>{t('overdraftSettings.amount')}</TableHead>
                        <TableHead>{t('overdraftSettings.maxPerDay')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeSchedule.map((fee: { chargeType: string; name: string; amountCents: number; maxPerDay: number | null }) => (
                        <TableRow key={fee.chargeType}>
                          <TableCell className="font-medium">{fee.name}</TableCell>
                          <TableCell>{formatCents(fee.amountCents)}</TableCell>
                          <TableCell>{fee.maxPerDay ?? t('overdraftSettings.noLimit')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Event History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5" /> {t('overdraftSettings.overdraftHistory')}
                </CardTitle>
                <CardDescription>{t('overdraftSettings.overdraftHistoryDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{t('overdraftSettings.noEvents')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('overdraftSettings.date')}</TableHead>
                        <TableHead>{t('overdraftSettings.amount')}</TableHead>
                        <TableHead>{t('overdraftSettings.fee')}</TableHead>
                        <TableHead>{t('overdraftSettings.type')}</TableHead>
                        <TableHead>{t('overdraftSettings.protected')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {events.map((event: { id: string; occurredAt: string; amountCents: number; feeCents: number; protectionType: string; wasProtected: boolean }) => (
                        <TableRow key={event.id}>
                          <TableCell>{new Date(event.occurredAt).toLocaleDateString()}</TableCell>
                          <TableCell>{formatCents(event.amountCents)}</TableCell>
                          <TableCell>{formatCents(event.feeCents)}</TableCell>
                          <TableCell className="capitalize">{event.protectionType.replace(/_/g, " ")}</TableCell>
                          <TableCell>
                            <Badge variant={event.wasProtected ? "default" : "destructive"}>
                              {event.wasProtected ? t('overdraftSettings.protectedStatus') : t('overdraftSettings.notProtected')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </AppShell>
  );
}
