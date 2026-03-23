import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Package, Truck, Clock, CheckCircle, XCircle, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppShell } from "@/components/AppShell";
import { formatCurrency } from "@/lib/common/currency";
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import {
  useCheckStyles,
  useCheckOrderConfig,
  useCheckOrders,
  useCreateCheckOrder,
  useCancelCheckOrder,
} from "@/hooks/useCheckOrders";
import { useAccounts } from "@/hooks/useAccounts";
import type { CheckStyle, CheckOrderStatus } from "@/types";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<
  string,
  { labelKey: string; className: string; icon: React.ElementType }
> = {
  pending: {
    labelKey: "checkOrdering.statusPending",
    className: "bg-yellow-100 text-yellow-700",
    icon: Clock,
  },
  processing: {
    labelKey: "checkOrdering.statusProcessing",
    className: "bg-blue-100 text-blue-700",
    icon: Package,
  },
  shipped: {
    labelKey: "checkOrdering.statusShipped",
    className: "bg-indigo-100 text-indigo-700",
    icon: Truck,
  },
  delivered: {
    labelKey: "checkOrdering.statusDelivered",
    className: "bg-green-100 text-green-700",
    icon: CheckCircle,
  },
  cancelled: {
    labelKey: "checkOrdering.statusCancelled",
    className: "bg-gray-100 text-gray-500",
    icon: XCircle,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CheckOrdering() {
  const { t } = useTranslation("banking");
  const [activeTab, setActiveTab] = useState("styles");
  const [selectedStyle, setSelectedStyle] = useState<CheckStyle | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState<number>(100);
  const [shippingMethod, setShippingMethod] = useState<"standard" | "expedited" | "overnight">(
    "standard",
  );
  const [startingCheckNumber, setStartingCheckNumber] = useState("");
  const { toast } = useToast();

  const { data: stylesData, isLoading: stylesLoading } = useCheckStyles();
  const { data: configData } = useCheckOrderConfig();
  const { data: ordersData, isLoading: ordersLoading } = useCheckOrders();
  const { data: accountsData } = useAccounts();
  const createOrder = useCreateCheckOrder();
  const cancelOrder = useCancelCheckOrder();

  const styles = stylesData?.styles ?? [];
  const orders = ordersData?.orders ?? [];
  const accounts = accountsData?.accounts ?? [];
  const checkingAccounts = accounts.filter((a) => a.type === "checking");
  const shippingOptions = configData?.shippingOptions ?? [];

  const shippingCost = shippingOptions.find((s) => s.method === shippingMethod)?.costCents ?? 0;
  const boxCount = selectedQuantity / 50;
  const checksCost = selectedStyle ? boxCount * selectedStyle.pricePerBoxCents : 0;
  const totalCost = checksCost + shippingCost;

  function handleOrder() {
    if (!selectedStyle || !selectedAccountId) {
      toast({
        title: t("checkOrdering.missingSelection"),
        description: t("checkOrdering.missingSelectionDesc"),
        variant: "destructive",
      });
      return;
    }
    createOrder.mutate(
      {
        accountId: selectedAccountId,
        styleId: selectedStyle.id,
        quantity: selectedQuantity,
        startingCheckNumber: startingCheckNumber || undefined,
        shippingMethod,
      },
      {
        onSuccess: () => {
          toast({
            title: t("checkOrdering.orderPlaced"),
            description: t("checkOrdering.orderPlacedDesc"),
          });
          setActiveTab("history");
          setSelectedStyle(null);
        },
        onError: () => {
          toast({
            title: t("checkOrdering.orderFailed"),
            description: t("checkOrdering.orderFailedDesc"),
            variant: "destructive",
          });
        },
      },
    );
  }

  function handleCancel(orderId: string) {
    cancelOrder.mutate(orderId, {
      onSuccess: () =>
        toast({
          title: t("checkOrdering.orderCancelled"),
          description: t("checkOrdering.orderCancelledDesc"),
        }),
      onError: () =>
        toast({
          title: t("checkOrdering.cancelFailed"),
          description: t("checkOrdering.cancelFailedDesc"),
          variant: "destructive",
        }),
    });
  }

  if (stylesLoading)
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" /> {t("checkOrdering.title")}
          </h1>
          <p className="text-muted-foreground">{t("checkOrdering.subtitle")}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="styles">{t("checkOrdering.checkDesigns")}</TabsTrigger>
            <TabsTrigger value="history">
              {t("checkOrdering.orderHistory")} ({orders.length})
            </TabsTrigger>
          </TabsList>

          {/* Check Styles Gallery */}
          <TabsContent value="styles" className="space-y-6">
            {/* Style Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {styles.map((style) => (
                <Card
                  key={style.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedStyle?.id === style.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedStyle(style)}
                >
                  <div className="aspect-[3/1] bg-muted rounded-t-lg overflow-hidden">
                    <img
                      src={style.imageUrl}
                      alt={style.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <CardContent className="pt-3 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{style.name}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {style.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {style.description}
                    </p>
                    <div className="text-sm font-medium text-primary">
                      {t("checkOrdering.pricePerBox", {
                        price: formatCurrency(style.pricePerBoxCents),
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Configuration */}
            {selectedStyle && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("checkOrdering.configureOrder")}</CardTitle>
                  <CardDescription>
                    {t("checkOrdering.selected", { name: selectedStyle.name })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("checkOrdering.account")}</Label>
                      <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("checkOrdering.selectCheckingAccount")} />
                        </SelectTrigger>
                        <SelectContent>
                          {checkingAccounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.nickname ?? t("checkOrdering.checking")} ({a.accountNumberMasked})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("checkOrdering.quantity")}</Label>
                      <Select
                        value={String(selectedQuantity)}
                        onValueChange={(v) => setSelectedQuantity(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(configData?.quantities ?? [50, 100, 150, 200]).map((q) => (
                            <SelectItem key={q} value={String(q)}>
                              {t("checkOrdering.checksCount", {
                                count: q,
                                boxes: q / 50,
                                boxLabel:
                                  q / 50 === 1 ? t("checkOrdering.box") : t("checkOrdering.boxes"),
                              })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("checkOrdering.shippingMethod")}</Label>
                      <Select
                        value={shippingMethod}
                        onValueChange={(v) => setShippingMethod(v as typeof shippingMethod)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {shippingOptions.map((opt) => (
                            <SelectItem key={opt.method} value={opt.method}>
                              {opt.label}{" "}
                              {opt.costCents > 0
                                ? `(${formatCurrency(opt.costCents)})`
                                : `(${t("checkOrdering.free")})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("checkOrdering.startingCheckNumber")}</Label>
                      <Input
                        value={startingCheckNumber}
                        onChange={(e) => setStartingCheckNumber(e.target.value)}
                        placeholder={t("checkOrdering.checkNumberPlaceholder")}
                        maxLength={10}
                      />
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold mb-2">{t("checkOrdering.orderSummary")}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>
                          {selectedStyle.name} x {boxCount}{" "}
                          {boxCount === 1 ? t("checkOrdering.box") : t("checkOrdering.boxes")}
                        </span>
                        <span>{formatCurrency(checksCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>
                          {t("checkOrdering.shipping")} ({shippingMethod})
                        </span>
                        <span>
                          {shippingCost > 0
                            ? formatCurrency(shippingCost)
                            : t("checkOrdering.free")}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold border-t pt-1 mt-1">
                        <span>{t("checkOrdering.total")}</span>
                        <span>{formatCurrency(totalCost)}</span>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-4"
                      onClick={handleOrder}
                      disabled={createOrder.isPending || !selectedAccountId}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {createOrder.isPending
                        ? t("checkOrdering.placingOrder")
                        : t("checkOrdering.placeOrder")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Order History */}
          <TabsContent value="history" className="space-y-4">
            {ordersLoading ? (
              <PageSkeleton />
            ) : orders.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {t("checkOrdering.noOrders")}
                </CardContent>
              </Card>
            ) : (
              orders.map((order) => {
                const cfg = statusConfig[order.status] ?? statusConfig.pending;
                const StatusIcon = cfg.icon;
                return (
                  <Card key={order.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <StatusIcon className="h-4 w-4" />
                            <span className="font-semibold">{order.styleName}</span>
                            <Badge className={cfg.className}>{t(cfg.labelKey)}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t("checkOrdering.orderDetails", {
                              quantity: order.quantity,
                              account: order.accountMasked,
                              method: order.shippingMethod,
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("checkOrdering.ordered", {
                              date: new Date(order.createdAt).toLocaleDateString(),
                            })}
                            {order.trackingNumber &&
                              ` \u00B7 ${t("checkOrdering.tracking", { number: order.trackingNumber })}`}
                            {order.estimatedDeliveryDate &&
                              ` \u00B7 ${t("checkOrdering.estDelivery", { date: new Date(order.estimatedDeliveryDate).toLocaleDateString() })}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrency(order.totalCostCents)}
                          </div>
                          {(order.status as CheckOrderStatus) === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => handleCancel(order.id)}
                              disabled={cancelOrder.isPending}
                            >
                              {t("checkOrdering.cancel")}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
