import { useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  CreditCard,
  Lock,
  Unlock,
  Wifi,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/common/currency";
import { useCards, useLockCard, useUnlockCard, useSetCardLimit } from "@/hooks/useCards";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { getStatusStyle } from "@/lib/common/design-tokens";


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Cards() {
  const { t } = useTranslation('banking');
  const [pendingLimits, setPendingLimits] = useState<Record<string, number>>({});
  const [showNumber, setShowNumber] = useState<Record<string, boolean>>({});
  const [confirmLockCardId, setConfirmLockCardId] = useState<string | null>(null);

  const { data, isLoading, error } = useCards();
  const lockCard = useLockCard();
  const unlockCard = useUnlockCard();
  const setCardLimit = useSetCardLimit();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const cards = data?.cards ?? [];

  const toggleLock = async (cardId: string, currentStatus: string) => {
    try {
      if (currentStatus === "active") {
        await lockCard.mutateAsync(cardId);
        toast({ title: t('cards.cardLockedToast'), description: t('cards.cardLockedToastDesc') });
      } else {
        await unlockCard.mutateAsync(cardId);
        toast({ title: t('cards.cardUnlockedToast'), description: t('cards.cardUnlockedToastDesc') });
      }
    } catch (err) {
      handleError(err, { fallbackTitle: t('cards.actionFailed') });
    }
  };

  const handleLimitChange = async (cardId: string, limitCents: number) => {
    setPendingLimits((prev) => ({ ...prev, [cardId]: limitCents }));
  };

  const handleLimitCommit = async (cardId: string) => {
    const limitCents = pendingLimits[cardId];
    if (limitCents === undefined) return;
    try {
      await setCardLimit.mutateAsync({ id: cardId, dailyLimitCents: limitCents });
      setPendingLimits((prev) => {
        const next = { ...prev };
        delete next[cardId];
        return next;
      });
      toast({ title: t('cards.limitUpdated'), description: t('cards.limitUpdatedDesc', { amount: formatCurrency(limitCents) }) });
    } catch (err) {
      handleError(err, { fallbackTitle: t('cards.actionFailed') });
    }
  };

  const toggleShowNumber = (cardId: string) => {
    setShowNumber((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">{t('cards.failedToLoad')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "An unexpected error occurred."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('cards.pageTitle')}</h1>
        <p className="text-muted-foreground">
          {t('cards.pageSubtitle')}
        </p>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={t('cards.noCards')}
          description={t('cards.noCardsDesc')}
        />
      ) : (
      <div className="grid gap-6">
        {cards.map((card) => {
          const currentStatus = card.status;
          const isLocked = currentStatus === "locked";
          const currentLimit = pendingLimits[card.id] ?? card.dailyLimitCents;
          const isNumberVisible = showNumber[card.id] ?? false;

          return (
            <Card key={card.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-muted p-2">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base capitalize">
                        {card.type} Card
                        {card.isVirtual && (
                          <Badge variant="outline" className="ml-2 text-[10px] py-0">
                            {t('cards.virtual')}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {card.cardholderName}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={`capitalize ${getStatusStyle(currentStatus).badge}`}>
                    {currentStatus}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Virtual card display */}
                <div
                  className={`relative rounded-xl p-6 text-white ${
                    card.type === "credit"
                      ? "bg-gradient-to-br from-slate-800 to-slate-600"
                      : card.isVirtual
                        ? "bg-gradient-to-br from-purple-700 to-purple-500"
                        : "bg-gradient-to-br from-blue-700 to-blue-500"
                  }`}
                >
                  <div className="flex items-center justify-between mb-8">
                    <p className="text-sm font-medium opacity-80 uppercase">
                      {card.type} {card.isVirtual ? "- Virtual" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      {card.isContactless && <Wifi className="h-5 w-5 opacity-80" />}
                      <ShieldCheck className="h-5 w-5 opacity-80" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-xl font-mono tracking-widest">
                      {isNumberVisible
                        ? `4532 •••• •••• ${card.lastFour}`
                        : `•••• •••• •••• ${card.lastFour}`}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 h-8 w-8 p-0"
                      onClick={() => toggleShowNumber(card.id)}
                    >
                      {isNumberVisible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs opacity-70">{t('cards.cardholder')}</p>
                      <p className="text-sm font-medium">{card.cardholderName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs opacity-70">{t('cards.expires')}</p>
                      <p className="text-sm font-medium">{card.expirationDate}</p>
                    </div>
                  </div>
                  {isLocked && (
                    <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <Lock className="h-8 w-8 mx-auto mb-2" />
                        <p className="font-medium">{t('cards.cardLocked')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Lock/Unlock */}
                  <div className="space-y-2">
                    <Label>{t('cards.cardStatus')}</Label>
                    <Button
                      variant={isLocked ? "default" : "outline"}
                      className="w-full"
                      disabled={lockCard.isPending || unlockCard.isPending}
                      onClick={() => {
                        if (currentStatus === "active") {
                          setConfirmLockCardId(card.id);
                        } else {
                          toggleLock(card.id, currentStatus);
                        }
                      }}
                    >
                      {isLocked ? (
                        <>
                          <Unlock className="h-4 w-4 mr-2" />
                          {t('cards.unlockCard')}
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          {t('cards.lockCard')}
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Daily limit */}
                  <div className="space-y-2">
                    <Label>
                      {t('cards.dailyLimitLabel', { amount: formatCurrency(currentLimit) })}
                    </Label>
                    <Slider
                      value={[currentLimit]}
                      min={10000}
                      max={2000000}
                      step={10000}
                      onValueChange={([val]) => handleLimitChange(card.id, val)}
                      onValueCommit={() => handleLimitCommit(card.id)}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(10000)}</span>
                      <span>{formatCurrency(2000000)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}

      <AlertDialog open={!!confirmLockCardId} onOpenChange={(open) => { if (!open) setConfirmLockCardId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cards.lockThisCard')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cards.lockThisCardDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmLockCardId) {
                  toggleLock(confirmLockCardId, "active");
                  setConfirmLockCardId(null);
                }
              }}
            >
              {t('cards.lockCard')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
