import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { FileText, Download, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";
import { useStatements, useStatementConfig } from "@/hooks/useStatements";
import { gateway } from "@/lib/gateway";
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { Spinner } from "@/components/common/Spinner";

export default function Statements() {
  const { t } = useTranslation('banking');
  const [selectedAccountId, setSelectedAccountId] = useState("");

  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const { data: configData } = useStatementConfig();
  const { data: statementsData, isLoading: statementsLoading } = useStatements(selectedAccountId);
  const { toast } = useToast();

  const accounts = accountsData?.accounts ?? [];
  const statements = statementsData?.statements ?? [];
  const config = configData?.config;

  const handleDownload = async (statementId: string) => {
    try {
      const result = await gateway.statements.download(statementId);
      window.open(result.downloadUrl, "_blank");
    } catch (err) {
      toast({
        title: t('statements.downloadFailed'),
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatPeriod = (start: string, end: string) => {
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} - ${e.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  };

  if (accountsLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('statements.title')}</h1>
        <p className="text-muted-foreground">
          {t('statements.subtitle')}
        </p>
      </div>

      {/* Config info */}
      {config && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('statements.formats')}: </span>
                <span className="font-medium capitalize">{config.supportedFormats.join(", ")}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t('statements.retention')}: </span>
                <span className="font-medium">{t('statements.retentionMonths', { count: config.retentionMonths })}</span>
              </div>
              {config.eStatementsEnabled && (
                <Badge variant="secondary">{t('statements.eStatementsEnabled')}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account selector */}
      <div className="space-y-2">
        <Label>{t('statements.selectAccount')}</Label>
        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
          <SelectTrigger>
            <SelectValue placeholder={t('statements.chooseAccount')} />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((acct) => (
              <SelectItem key={acct.id} value={acct.id}>
                {acct.nickname} ({acct.accountNumberMasked})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Statements list */}
      {!selectedAccountId ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t('statements.selectAccountPrompt')}</p>
          </CardContent>
        </Card>
      ) : statementsLoading ? (
        <div className="flex justify-center py-8" role="status" aria-label="Loading statements">
          <Spinner />
        </div>
      ) : statements.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('statements.noStatements')}
          description={t('statements.noStatementsDescription')}
        />
      ) : (
        <div className="space-y-3">
          {statements.map((stmt) => (
            <Card key={stmt.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-full bg-muted p-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {new Date(stmt.periodStart + "T00:00:00").toLocaleDateString(undefined, {
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatPeriod(stmt.periodStart, stmt.periodEnd)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="uppercase text-[10px]">
                    {stmt.format}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(stmt.id)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {t('statements.download')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
