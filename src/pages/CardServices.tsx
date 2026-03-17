import { useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  Plane,
  MapPin,
  Phone,
  Calendar,
  CreditCard,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Plus,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useCards } from "@/hooks/useCards";
import {
  useTravelNotices,
  useCreateTravelNotice,
  useCancelTravelNotice,
  useCardReplacements,
  useRequestCardReplacement,
  useActivateReplacementCard,
} from "@/hooks/useCardServices";
import { formatCurrency } from "@/lib/common/currency";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { CardReplacementReason, CardReplacementStatus } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getReasonLabels(t: (key: string) => string): Record<CardReplacementReason, string> {
  return {
    lost: t('cardServices.reasonLost'),
    stolen: t('cardServices.reasonStolen'),
    damaged: t('cardServices.reasonDamaged'),
    expired: t('cardServices.reasonExpired'),
    name_change: t('cardServices.reasonNameChange'),
  };
}

function replacementStatusBadge(status: CardReplacementStatus) {
  const map: Record<CardReplacementStatus, string> = {
    requested: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    shipped: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    activated: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-gray-100 text-gray-800",
  };
  return map[status] ?? "bg-gray-100 text-gray-800";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CardServices() {
  const [tab, setTab] = useState("travel");
  const { toast } = useToast();
  const { handleError } = useErrorHandler();
  const { t } = useTranslation('banking');

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('cardServices.title')}</h1>
        <p className="text-muted-foreground">{t('cardServices.subtitle')}</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="travel"><Plane className="h-4 w-4 mr-2" />{t('cardServices.travelNotices')}</TabsTrigger>
          <TabsTrigger value="replacement"><CreditCard className="h-4 w-4 mr-2" />{t('cardServices.cardReplacement')}</TabsTrigger>
        </TabsList>

        <TabsContent value="travel" className="space-y-6 mt-6">
          <TravelNoticesTab toast={toast} handleError={handleError} />
        </TabsContent>

        <TabsContent value="replacement" className="space-y-6 mt-6">
          <CardReplacementTab toast={toast} handleError={handleError} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Travel Notices Tab
// ---------------------------------------------------------------------------

interface TabProps {
  toast: ReturnType<typeof useToast>["toast"];
  handleError: ReturnType<typeof useErrorHandler>["handleError"];
}

function TravelNoticesTab({ toast, handleError }: TabProps) {
  const { t } = useTranslation('banking');
  const { data: cardsData } = useCards();
  const { data, isLoading, error } = useTravelNotices();
  const createNotice = useCreateTravelNotice();
  const cancelNotice = useCancelTravelNotice();

  const [showForm, setShowForm] = useState(false);
  const [cardId, setCardId] = useState("");
  const [destinations, setDestinations] = useState([{ country: "", region: "" }]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const cards = cardsData?.cards ?? [];
  const notices = data?.notices ?? [];

  const addDestination = () => setDestinations([...destinations, { country: "", region: "" }]);
  const removeDestination = (i: number) => setDestinations(destinations.filter((_, idx) => idx !== i));
  const updateDestination = (i: number, field: "country" | "region", value: string) => {
    const updated = [...destinations];
    updated[i] = { ...updated[i], [field]: value };
    setDestinations(updated);
  };

  const handleCreate = async () => {
    const validDests = destinations.filter((d) => d.country.trim());
    if (!cardId || validDests.length === 0 || !startDate || !endDate) {
      toast({ title: t('cardServices.missingFields'), description: t('cardServices.fillRequiredFields'), variant: "destructive" });
      return;
    }
    try {
      await createNotice.mutateAsync({
        cardId,
        destinations: validDests.map((d) => ({ country: d.country, region: d.region || undefined })),
        startDate,
        endDate,
        contactPhone: contactPhone || undefined,
      });
      toast({ title: t('cardServices.noticeCreated'), description: t('cardServices.noticeCreatedDesc') });
      setShowForm(false);
      setCardId("");
      setDestinations([{ country: "", region: "" }]);
      setStartDate("");
      setEndDate("");
      setContactPhone("");
    } catch (err) {
      handleError(err, { fallbackTitle: t('cardServices.failedCreateNotice') });
    }
  };

  const handleCancel = async (noticeId: string) => {
    try {
      await cancelNotice.mutateAsync(noticeId);
      toast({ title: t('cardServices.noticeCancelled') });
      setConfirmCancel(null);
    } catch (err) {
      handleError(err, { fallbackTitle: t('cardServices.failedCancelNotice') });
    }
  };

  if (isLoading) return <PageSkeleton />;
  if (error) return <Card><CardContent className="py-8 text-center text-destructive">{t('cardServices.failedLoadNotices')}</CardContent></Card>;

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('cardServices.travelNoticeDesc')}</p>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />{t('cardServices.newNotice')}</Button>
      </div>

      {notices.length === 0 ? (
        <EmptyState icon={Plane} title={t('cardServices.noTravelNotices')} description={t('cardServices.noTravelNoticesDesc')} />
      ) : (
        <div className="grid gap-4">
          {notices.map((n) => (
            <Card key={n.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{n.destinations.map((d) => d.region ? `${d.region}, ${d.country}` : d.country).join(" / ")}</span>
                      <Badge variant={n.isActive ? "default" : "secondary"}>{n.isActive ? t('cardServices.active') : t('cardServices.expired')}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" />****{n.cardLastFour}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{n.startDate} to {n.endDate}</span>
                      {n.contactPhone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{n.contactPhone}</span>}
                    </div>
                  </div>
                  {n.isActive && (
                    <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(n.id)}>
                      <XCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('cardServices.newTravelNotice')}</DialogTitle>
            <DialogDescription>{t('cardServices.newTravelNoticeDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('cardServices.card')}</Label>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger><SelectValue placeholder={t('cardServices.selectCard')} /></SelectTrigger>
                <SelectContent>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>****{c.lastFour} ({c.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('cardServices.destinations')}</Label>
              {destinations.map((d, i) => (
                <div key={i} className="flex gap-2 mt-2">
                  <Input placeholder={t('cardServices.country')} value={d.country} onChange={(e) => updateDestination(i, "country", e.target.value)} />
                  <Input placeholder={t('cardServices.regionOptional')} value={d.region} onChange={(e) => updateDestination(i, "region", e.target.value)} />
                  {destinations.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeDestination(i)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              ))}
              <Button variant="link" size="sm" className="mt-1 p-0" onClick={addDestination}><Plus className="h-3 w-3 mr-1" />{t('cardServices.addDestination')}</Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>{t('cardServices.startDate')}</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
              <div><Label>{t('cardServices.endDate')}</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            </div>
            <div><Label>{t('cardServices.contactPhoneOptional')}</Label><Input placeholder="+1 555-0123" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('cardServices.cancel')}</Button>
            <Button onClick={handleCreate} disabled={createNotice.isPending}>{createNotice.isPending ? t('cardServices.creating') : t('cardServices.createNotice')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!confirmCancel} onOpenChange={(o) => { if (!o) setConfirmCancel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cardServices.cancelTravelNotice')}</AlertDialogTitle>
            <AlertDialogDescription>{t('cardServices.cancelTravelNoticeDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cardServices.keepActive')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmCancel && handleCancel(confirmCancel)}>{t('cardServices.cancelNotice')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Card Replacement Tab
// ---------------------------------------------------------------------------

function CardReplacementTab({ toast, handleError }: TabProps) {
  const { t } = useTranslation('banking');
  const { data: cardsData } = useCards();
  const { data, isLoading, error } = useCardReplacements();
  const requestReplacement = useRequestCardReplacement();
  const activateCard = useActivateReplacementCard();

  const [showForm, setShowForm] = useState(false);
  const [cardId, setCardId] = useState("");
  const [reason, setReason] = useState<CardReplacementReason | "">("");
  const [shippingMethod, setShippingMethod] = useState<"standard" | "expedited">("standard");
  const [reportFraud, _setReportFraud] = useState(true);
  const [activateDialog, setActivateDialog] = useState<string | null>(null);
  const [lastFour, setLastFour] = useState("");

  const cards = cardsData?.cards ?? [];
  const replacements = data?.replacements ?? [];
  const reasonLabels = getReasonLabels(t);
  const isLostStolen = reason === "lost" || reason === "stolen";

  const handleRequest = async () => {
    if (!cardId || !reason) {
      toast({ title: t('cardServices.missingFields'), description: t('cardServices.selectCardAndReason'), variant: "destructive" });
      return;
    }
    try {
      await requestReplacement.mutateAsync({
        cardId,
        reason: reason as CardReplacementReason,
        shippingMethod,
        reportFraud: isLostStolen ? reportFraud : undefined,
      });
      toast({ title: t('cardServices.replacementRequested'), description: t('cardServices.replacementRequestedDesc') });
      setShowForm(false);
      setCardId("");
      setReason("");
      setShippingMethod("standard");
    } catch (err) {
      handleError(err, { fallbackTitle: t('cardServices.requestFailed') });
    }
  };

  const handleActivate = async () => {
    if (!activateDialog || !lastFour || lastFour.length !== 4) {
      toast({ title: t('cardServices.invalidInput'), description: t('cardServices.enterLastFour'), variant: "destructive" });
      return;
    }
    try {
      await activateCard.mutateAsync({ replacementId: activateDialog, lastFourDigits: lastFour });
      toast({ title: t('cardServices.cardActivated'), description: t('cardServices.cardActivatedDesc') });
      setActivateDialog(null);
      setLastFour("");
    } catch (err) {
      handleError(err, { fallbackTitle: t('cardServices.activationFailed') });
    }
  };

  if (isLoading) return <PageSkeleton />;
  if (error) return <Card><CardContent className="py-8 text-center text-destructive">{t('cardServices.failedLoadReplacements')}</CardContent></Card>;

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{t('cardServices.replacementDesc')}</p>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />{t('cardServices.requestReplacement')}</Button>
      </div>

      {replacements.length === 0 ? (
        <EmptyState icon={Package} title={t('cardServices.noReplacements')} description={t('cardServices.noReplacementsDesc')} />
      ) : (
        <div className="grid gap-4">
          {replacements.map((r) => (
            <Card key={r.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">****{r.cardLastFour}</span>
                      <Badge className={replacementStatusBadge(r.status)}>{r.status}</Badge>
                      {r.fraudReported && <Badge variant="destructive">{t('cardServices.fraudReported')}</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{t('cardServices.reason')}: {reasonLabels[r.reason]}</span>
                      <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{r.shippingMethod}</span>
                      {r.estimatedDeliveryDate && <span>{t('cardServices.estDelivery')}: {r.estimatedDeliveryDate}</span>}
                      {r.feeCents > 0 && <span>{t('cardServices.fee')}: {formatCurrency(r.feeCents)}</span>}
                    </div>
                    {r.trackingNumber && <p className="text-xs text-muted-foreground">{t('cardServices.tracking')}: {r.trackingNumber}</p>}
                  </div>
                  {(r.status === "shipped" || r.status === "delivered") && (
                    <Button size="sm" onClick={() => setActivateDialog(r.id)}><CheckCircle className="h-4 w-4 mr-1" />{t('cardServices.activate')}</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Request Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cardServices.requestCardReplacement')}</DialogTitle>
            <DialogDescription>{t('cardServices.requestCardReplacementDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('cardServices.card')}</Label>
              <Select value={cardId} onValueChange={setCardId}>
                <SelectTrigger><SelectValue placeholder={t('cardServices.selectCard')} /></SelectTrigger>
                <SelectContent>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>****{c.lastFour} ({c.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('cardServices.reason')}</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as CardReplacementReason)}>
                <SelectTrigger><SelectValue placeholder={t('cardServices.selectReason')} /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(reasonLabels) as CardReplacementReason[]).map((r) => (
                    <SelectItem key={r} value={r}>{reasonLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isLostStolen && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <span>{t('cardServices.cardLockedWarning')}</span>
              </div>
            )}
            <div>
              <Label>{t('cardServices.shippingMethod')}</Label>
              <Select value={shippingMethod} onValueChange={(v) => setShippingMethod(v as "standard" | "expedited")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{t('cardServices.shippingStandard')}</SelectItem>
                  <SelectItem value="expedited">{t('cardServices.shippingExpedited')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('cardServices.cancel')}</Button>
            <Button onClick={handleRequest} disabled={requestReplacement.isPending}>
              {requestReplacement.isPending ? t('cardServices.requesting') : t('cardServices.requestReplacement')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Dialog */}
      <Dialog open={!!activateDialog} onOpenChange={(o) => { if (!o) { setActivateDialog(null); setLastFour(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cardServices.activateNewCard')}</DialogTitle>
            <DialogDescription>{t('cardServices.activateNewCardDesc')}</DialogDescription>
          </DialogHeader>
          <div><Label>{t('cardServices.lastFourDigits')}</Label><Input maxLength={4} placeholder="1234" value={lastFour} onChange={(e) => setLastFour(e.target.value.replace(/\D/g, ""))} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setActivateDialog(null); setLastFour(""); }}>{t('cardServices.cancel')}</Button>
            <Button onClick={handleActivate} disabled={activateCard.isPending}>{activateCard.isPending ? t('cardServices.activating') : t('cardServices.activateCard')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
