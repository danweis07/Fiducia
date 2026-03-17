import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Gift,
  Tag,
  CheckCircle,
  Clock,
  MapPin,
  TrendingUp,
  DollarSign,
  Percent,
  Star,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/common/currency";
import { gateway } from "@/lib/gateway";
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { useTranslation } from "react-i18next";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatReward(offerType: string, rewardValue: number): string {
  switch (offerType) {
    case "cashback_percent":
      return `${(rewardValue / 100).toFixed(0)}% cash back`;
    case "cashback_flat":
      return `${formatCurrency(rewardValue)} back`;
    case "discount_percent":
      return `${(rewardValue / 100).toFixed(0)}% off`;
    case "discount_flat":
      return `${formatCurrency(rewardValue)} off`;
    case "bonus_points":
      return `${rewardValue} bonus points`;
    default:
      return `${rewardValue}`;
  }
}

function daysUntil(dateStr: string): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CardOffers() {
  const { t } = useTranslation("banking");
  const [activeTab, setActiveTab] = useState("available");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: offersData, isLoading: offersLoading } = useQuery({
    queryKey: ["card-offers"],
    queryFn: () => gateway.offers.list(),
  });

  const { data: summaryData } = useQuery({
    queryKey: ["card-offers-summary"],
    queryFn: () => gateway.offers.summary(),
  });

  const { data: redemptionsData } = useQuery({
    queryKey: ["card-offers-redemptions"],
    queryFn: () => gateway.offers.redemptions(),
  });

  const { data: cardsData } = useQuery({
    queryKey: ["cards"],
    queryFn: () => gateway.cards.list(),
  });

  const activateMutation = useMutation({
    mutationFn: ({ offerId, cardId }: { offerId: string; cardId: string }) =>
      gateway.offers.activate(offerId, cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-offers"] });
      queryClient.invalidateQueries({ queryKey: ["card-offers-summary"] });
      toast({
        title: t("cardOffers.offerActivated"),
        description: t("cardOffers.offerActivatedDesc"),
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (offerId: string) => gateway.offers.deactivate(offerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card-offers"] });
      queryClient.invalidateQueries({ queryKey: ["card-offers-summary"] });
      toast({
        title: t("cardOffers.offerDeactivated"),
        description: t("cardOffers.offerDeactivatedDesc"),
      });
    },
  });

  const offers = offersData?.offers ?? [];
  const creditCard = cardsData?.cards?.find((c) => c.type === "credit");
  const defaultCardId = creditCard?.id ?? "card-default";

  const availableOffers = offers.filter((o) => o.status === "available");
  const activatedOffers = offers.filter((o) => o.status === "activated");

  if (offersLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("cardOffers.title")}</h1>
        <p className="text-muted-foreground">{t("cardOffers.subtitle")}</p>
      </div>

      {/* Summary Cards */}
      {summaryData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <Gift className="h-5 w-5 mx-auto mb-1 text-blue-600" />
              <div className="text-2xl font-bold">{summaryData.availableCount}</div>
              <div className="text-xs text-muted-foreground">{t("cardOffers.available")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600" />
              <div className="text-2xl font-bold">{summaryData.activatedCount}</div>
              <div className="text-xs text-muted-foreground">{t("cardOffers.activated")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-emerald-600" />
              <div className="text-2xl font-bold">
                {formatCurrency(summaryData.monthlyRewardsCents)}
              </div>
              <div className="text-xs text-muted-foreground">{t("cardOffers.thisMonth")}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1 text-purple-600" />
              <div className="text-2xl font-bold">
                {formatCurrency(summaryData.totalRewardsCents)}
              </div>
              <div className="text-xs text-muted-foreground">{t("cardOffers.totalEarned")}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Offers Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="available">
            {t("cardOffers.availableCount", { count: availableOffers.length })}
          </TabsTrigger>
          <TabsTrigger value="activated">
            {t("cardOffers.activatedCount", { count: activatedOffers.length })}
          </TabsTrigger>
          <TabsTrigger value="rewards">{t("cardOffers.rewardsHistory")}</TabsTrigger>
        </TabsList>

        {/* Available Offers */}
        <TabsContent value="available" className="space-y-4">
          {availableOffers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t("cardOffers.noAvailable")}
              </CardContent>
            </Card>
          ) : (
            availableOffers.map((offer) => (
              <Card key={offer.offerId}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Merchant Logo */}
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      {offer.merchant.logoUrl ? (
                        <img
                          src={offer.merchant.logoUrl}
                          alt={offer.merchant.name}
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <Tag className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Offer Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{offer.merchant.name}</span>
                        {offer.isPersonalized && (
                          <Badge variant="outline" className="text-xs">
                            <Star className="h-3 w-3 mr-1" /> {t("cardOffers.forYou")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-primary">{offer.headline}</p>
                      <p className="text-sm text-muted-foreground mt-1">{offer.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {daysUntil(offer.expiresAt)}d left
                        </span>
                        {offer.minimumSpendCents && (
                          <span>Min. spend {formatCurrency(offer.minimumSpendCents)}</span>
                        )}
                        {offer.maximumRewardCents && (
                          <span>Max reward {formatCurrency(offer.maximumRewardCents)}</span>
                        )}
                        {offer.merchant.locations?.length && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {t("cardOffers.nearby")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reward + Action */}
                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center gap-1 text-lg font-bold text-primary mb-2">
                        <Percent className="h-4 w-4" />
                        {formatReward(offer.offerType, offer.rewardValue)}
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          activateMutation.mutate({ offerId: offer.offerId, cardId: defaultCardId })
                        }
                        disabled={activateMutation.isPending}
                      >
                        {t("cards.activateCard")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Activated Offers */}
        <TabsContent value="activated" className="space-y-4">
          {activatedOffers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {t("cardOffers.noActivated")}
              </CardContent>
            </Card>
          ) : (
            activatedOffers.map((offer) => (
              <Card key={offer.offerId} className="border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center overflow-hidden">
                      {offer.merchant.logoUrl ? (
                        <img
                          src={offer.merchant.logoUrl}
                          alt={offer.merchant.name}
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{offer.merchant.name}</span>
                        <StatusBadge status="activated" />
                      </div>
                      <p className="text-sm font-medium">{offer.headline}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {daysUntil(offer.expiresAt)}d left
                        </span>
                        {offer.activatedAt && (
                          <span>Activated {new Date(offer.activatedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-sm font-semibold text-green-700 mb-2">
                        {formatReward(offer.offerType, offer.rewardValue)}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deactivateMutation.mutate(offer.offerId)}
                        disabled={deactivateMutation.isPending}
                      >
                        {t("cardOffers.deactivate")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Rewards History */}
        <TabsContent value="rewards" className="space-y-4">
          {redemptionsData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("cardOffers.rewardsEarned")}</CardTitle>
                <CardDescription>
                  {t("cardOffers.totalRewards", {
                    amount: formatCurrency(redemptionsData.totalRewardsCents),
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {redemptionsData.redemptions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    {t("cardOffers.noRewards")}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {redemptionsData.redemptions.map((r) => (
                      <div
                        key={r.redemptionId}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div>
                          <div className="font-medium">{r.merchantName}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(r.redeemedAt).toLocaleDateString()} &middot; Purchase{" "}
                            {formatCurrency(r.transactionAmountCents)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-700">
                            +{formatCurrency(r.rewardAmountCents)}
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              r.payoutStatus === "credited" ? "text-green-600" : "text-yellow-600"
                            }
                          >
                            {r.payoutStatus}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
