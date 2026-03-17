import { useState, useCallback } from "react";
import { useTranslation } from 'react-i18next';
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle2, AlertCircle, Sparkles, Zap, ArrowRight } from "lucide-react";
import { useInvoices, useAnalyzeInvoice, useConfirmInvoice, useCancelInvoice } from "@/hooks/useInvoiceProcessor";
import { useAccounts } from "@/hooks/useAccounts";
import { useToast } from "@/hooks/use-toast";
import type { ParsedInvoice, InvoiceStatus } from "@/types";

const STATUS_BADGES: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Processing", variant: "secondary" },
  parsed: { label: "Ready to Confirm", variant: "default" },
  confirmed: { label: "Confirmed", variant: "outline" },
  scheduled: { label: "Scheduled", variant: "default" },
  paid: { label: "Paid", variant: "default" },
  failed: { label: "Cancelled", variant: "destructive" },
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

export default function InvoiceProcessorPage() {
  const { t } = useTranslation('banking');
  const { toast } = useToast();
  const { data: invoicesData, isLoading } = useInvoices();
  const invoices = invoicesData?.invoices ?? [];
  const { data: accountsData } = useAccounts();
  const accounts = accountsData?.accounts ?? [];

  const analyzeInvoice = useAnalyzeInvoice();
  const confirmInvoice = useConfirmInvoice();
  const cancelInvoice = useCancelInvoice();

  const [isDragging, setIsDragging] = useState(false);
  const [reviewInvoice, setReviewInvoice] = useState<ParsedInvoice | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");

  const handleFile = useCallback((file: File) => {
    if (!file.type.includes("pdf") && !file.type.includes("image")) {
      toast({ title: t('invoiceProcessor.unsupportedFileType'), description: t('invoiceProcessor.unsupportedFileTypeDesc'), variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      analyzeInvoice.mutate(
        { fileBase64: base64, fileName: file.name, mimeType: file.type },
        {
          onSuccess: (data) => {
            const inv = data.invoice;
            setReviewInvoice(inv);
            if (inv.suggestedAccountId) setSelectedAccountId(inv.suggestedAccountId);
            if (inv.dueDate) setScheduledDate(inv.dueDate);
            toast({ title: t('invoiceProcessor.invoiceAnalyzed'), description: `${inv.vendorName || t('invoiceProcessor.vendor')} - ${inv.amountCents ? formatCurrency(inv.amountCents) : t('invoiceProcessor.processing')}` });
          },
          onError: () => {
            toast({ title: t('invoiceProcessor.analysisFailed'), description: t('invoiceProcessor.analysisFailedDesc'), variant: "destructive" });
          },
        }
      );
    };
    reader.readAsDataURL(file);
  }, [analyzeInvoice, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleConfirm = () => {
    if (!reviewInvoice || !selectedAccountId || !scheduledDate) {
      toast({ title: t('invoiceProcessor.missingFields'), description: t('invoiceProcessor.missingFieldsDesc'), variant: "destructive" });
      return;
    }
    confirmInvoice.mutate(
      { invoiceId: reviewInvoice.id, accountId: selectedAccountId, scheduledDate },
      {
        onSuccess: () => {
          toast({ title: t('invoiceProcessor.paymentScheduled'), description: t('invoiceProcessor.paymentScheduledDesc', { amount: formatCurrency(reviewInvoice.amountCents), date: scheduledDate }) });
          setReviewInvoice(null);
        },
      }
    );
  };

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  return (
    <AppShell>
      <div className="container mx-auto max-w-6xl py-6 px-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            {t('invoiceProcessor.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('invoiceProcessor.subtitle')}
          </p>
        </div>

        {/* Drop Zone */}
        <Card
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            {analyzeInvoice.isPending ? (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{t('invoiceProcessor.analyzingInvoice')}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t('invoiceProcessor.analyzingInvoiceDesc')}</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">{t('invoiceProcessor.dropInvoiceHere')}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('invoiceProcessor.dropInvoiceHereDesc')}
                </p>
                <label className="mt-4">
                  <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileInput} />
                  <Button variant="outline" asChild>
                    <span>{t('invoiceProcessor.browseFiles')}</span>
                  </Button>
                </label>
              </>
            )}
          </CardContent>
        </Card>

        {/* How it Works */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="w-8 h-8 mx-auto text-blue-500 mb-2" />
              <h4 className="font-semibold">{t('invoiceProcessor.step1Title')}</h4>
              <p className="text-sm text-muted-foreground">{t('invoiceProcessor.step1Desc')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Sparkles className="w-8 h-8 mx-auto text-purple-500 mb-2" />
              <h4 className="font-semibold">{t('invoiceProcessor.step2Title')}</h4>
              <p className="text-sm text-muted-foreground">{t('invoiceProcessor.step2Desc')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
              <h4 className="font-semibold">{t('invoiceProcessor.step3Title')}</h4>
              <p className="text-sm text-muted-foreground">{t('invoiceProcessor.step3Desc')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Invoice History */}
        <Tabs defaultValue="all">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="all">{t('invoiceProcessor.allInvoices')}</TabsTrigger>
              <TabsTrigger value="pending">{t('invoiceProcessor.pending')}</TabsTrigger>
              <TabsTrigger value="scheduled">{t('invoiceProcessor.scheduled')}</TabsTrigger>
              <TabsTrigger value="paid">{t('invoiceProcessor.paid')}</TabsTrigger>
            </TabsList>
          </div>

          {["all", "pending", "scheduled", "paid"].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {tab === "all" ? t('invoiceProcessor.invoiceHistory') : t('invoiceProcessor.tabInvoices', { tab: tab.charAt(0).toUpperCase() + tab.slice(1) })}
                  </CardTitle>
                  <CardDescription>
                    {t('invoiceProcessor.invoiceHistoryDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">{t('invoiceProcessor.loadingInvoices')}</div>
                  ) : invoices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {t('invoiceProcessor.noInvoices')}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('invoiceProcessor.vendor')}</TableHead>
                          <TableHead>{t('invoiceProcessor.amount')}</TableHead>
                          <TableHead>{t('invoiceProcessor.dueDate')}</TableHead>
                          <TableHead>{t('invoiceProcessor.status')}</TableHead>
                          <TableHead>{t('invoiceProcessor.confidence')}</TableHead>
                          <TableHead className="text-right">{t('invoiceProcessor.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices
                          .filter(inv => tab === "all" || inv.status === tab)
                          .map((inv) => {
                            const badge = STATUS_BADGES[inv.status] ?? STATUS_BADGES.pending;
                            return (
                              <TableRow key={inv.id}>
                                <TableCell className="font-medium">{inv.vendorName || inv.fileName}</TableCell>
                                <TableCell>{inv.amountCents ? formatCurrency(inv.amountCents) : "--"}</TableCell>
                                <TableCell>{inv.dueDate || "--"}</TableCell>
                                <TableCell>
                                  <Badge variant={badge.variant}>{badge.label}</Badge>
                                </TableCell>
                                <TableCell>
                                  {inv.confidence > 0 ? `${Math.round(inv.confidence * 100)}%` : "--"}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                  {inv.status === "parsed" && (
                                    <Button size="sm" onClick={() => {
                                      setReviewInvoice(inv);
                                      if (inv.suggestedAccountId) setSelectedAccountId(inv.suggestedAccountId);
                                      if (inv.dueDate) setScheduledDate(inv.dueDate);
                                    }}>
                                      {t('invoiceProcessor.review')} <ArrowRight className="w-3 h-3 ml-1" />
                                    </Button>
                                  )}
                                  {(inv.status === "pending" || inv.status === "parsed") && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => cancelInvoice.mutate(inv.id, {
                                        onSuccess: () => toast({ title: t('invoiceProcessor.invoiceCancelled') }),
                                      })}
                                    >
                                      {t('invoiceProcessor.cancel')}
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Review & Confirm Dialog */}
        <Dialog open={!!reviewInvoice} onOpenChange={(open) => { if (!open) setReviewInvoice(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {t('invoiceProcessor.aiParsedInvoice')}
              </DialogTitle>
              <DialogDescription>
                {t('invoiceProcessor.reviewAndSchedule')}
              </DialogDescription>
            </DialogHeader>

            {reviewInvoice && (
              <div className="space-y-4">
                {/* AI Suggestion Banner */}
                {reviewInvoice.vendorName && reviewInvoice.amountCents > 0 && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <p className="text-sm font-medium">
                      {t('invoiceProcessor.invoiceDetected', { vendor: reviewInvoice.vendorName, amount: formatCurrency(reviewInvoice.amountCents) })}
                      {reviewInvoice.availableBalanceCents !== null && (
                        <> {t('invoiceProcessor.availableBalance', { amount: formatCurrency(reviewInvoice.availableBalanceCents), account: reviewInvoice.suggestedAccountName ?? t('invoiceProcessor.account') })}</>
                      )}
                      {reviewInvoice.dueDate && (
                        <> {t('invoiceProcessor.scheduleSuggestion', { date: reviewInvoice.dueDate })}</>
                      )}
                    </p>
                  </div>
                )}

                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('invoiceProcessor.vendor')}</span>
                    <p className="font-medium">{reviewInvoice.vendorName || "--"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('invoiceProcessor.amount')}</span>
                    <p className="font-medium">{reviewInvoice.amountCents ? formatCurrency(reviewInvoice.amountCents) : "--"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('invoiceProcessor.dueDate')}</span>
                    <p className="font-medium">{reviewInvoice.dueDate || "--"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('invoiceProcessor.invoiceNumber')}</span>
                    <p className="font-medium">{reviewInvoice.invoiceNumber || "--"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('invoiceProcessor.confidence')}</span>
                    <p className="font-medium">{reviewInvoice.confidence > 0 ? `${Math.round(reviewInvoice.confidence * 100)}%` : "--"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('invoiceProcessor.file')}</span>
                    <p className="font-medium truncate">{reviewInvoice.fileName}</p>
                  </div>
                </div>

                {/* Payment Configuration */}
                <div className="space-y-3 pt-2">
                  <div>
                    <Label>{t('invoiceProcessor.payFromAccount')}</Label>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('invoiceProcessor.selectAccount')} />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map(acc => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({formatCurrency(acc.availableBalance ?? 0)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{t('invoiceProcessor.scheduleDate')}</Label>
                    <Input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Sufficiency Warning */}
                {selectedAccount && reviewInvoice.amountCents > 0 && (selectedAccount.availableBalance ?? 0) < reviewInvoice.amountCents && (
                  <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                    <p className="text-sm text-destructive">
                      {t('invoiceProcessor.insufficientFunds', { balance: formatCurrency(selectedAccount.availableBalance ?? 0) })}
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewInvoice(null)}>{t('invoiceProcessor.cancel')}</Button>
              <Button
                onClick={handleConfirm}
                disabled={confirmInvoice.isPending || !selectedAccountId || !scheduledDate}
              >
                {confirmInvoice.isPending ? t('invoiceProcessor.scheduling') : t('invoiceProcessor.schedulePayment')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
