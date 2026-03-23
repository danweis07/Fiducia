import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Database,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Settings,
  Activity,
  BarChart3,
  Send,
  Loader2,
  Eye,
  EyeOff,
  Power,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import {
  useCDPConfig,
  useUpdateCDPConfig,
  useCDPDestinations,
  useCreateCDPDestination,
  useUpdateCDPDestination,
  useDeleteCDPDestination,
  useCDPRecentEvents,
  useCDPEventSummary,
} from "@/hooks/useAdminCDP";

// ---------------------------------------------------------------------------
// Destination type catalog
// ---------------------------------------------------------------------------

const DESTINATION_TYPES = [
  { value: "google_analytics", label: "Google Analytics", category: "analytics" },
  { value: "hubspot", label: "HubSpot", category: "crm" },
  { value: "salesforce", label: "Salesforce", category: "crm" },
  { value: "braze", label: "Braze", category: "marketing" },
  { value: "mailchimp", label: "Mailchimp", category: "marketing" },
  { value: "snowflake", label: "Snowflake", category: "data_warehouse" },
  { value: "bigquery", label: "BigQuery", category: "data_warehouse" },
  { value: "redshift", label: "Redshift", category: "data_warehouse" },
  { value: "facebook_pixel", label: "Facebook Pixel", category: "advertising" },
  { value: "google_ads", label: "Google Ads", category: "advertising" },
  { value: "amplitude", label: "Amplitude", category: "analytics" },
  { value: "mixpanel", label: "Mixpanel", category: "analytics" },
  { value: "intercom", label: "Intercom", category: "crm" },
  { value: "segment", label: "Segment", category: "analytics" },
  { value: "webhook", label: "Custom Webhook", category: "other" },
] as const;

const CATEGORY_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  analytics: "default",
  crm: "secondary",
  marketing: "outline",
  data_warehouse: "default",
  advertising: "secondary",
  other: "outline",
};

// ---------------------------------------------------------------------------
// Config Tab
// ---------------------------------------------------------------------------

function ConfigTab() {
  const { t } = useTranslation("admin");
  const { data, isLoading } = useCDPConfig();
  const updateConfig = useUpdateCDPConfig();
  const { toast } = useToast();

  const [showKey, setShowKey] = useState(false);
  const [writeKey, setWriteKey] = useState("");
  const [dataPlaneUrl, setDataPlaneUrl] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const config = data?.config;

  // Sync form state when data loads
  if (config && !initialized) {
    setEnabled(config.enabled);
    setDataPlaneUrl(config.dataPlaneUrl);
    setWriteKey(config.writeKey);
    setInitialized(true);
  }

  const handleSave = () => {
    updateConfig.mutate(
      {
        enabled,
        writeKey: writeKey.includes("••••") ? undefined : writeKey,
        dataPlaneUrl,
      },
      {
        onSuccess: () => {
          toast({ title: t("cdpManager.config.toasts.saved") });
        },
        onError: () => {
          toast({ title: t("cdpManager.config.toasts.saveFailed"), variant: "destructive" });
        },
      },
    );
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t("cdpManager.config.connectionTitle")}
              </CardTitle>
              <CardDescription>{t("cdpManager.config.connectionDescription")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="cdp-enabled" className="text-sm">
                {enabled ? t("cdpManager.config.active") : t("cdpManager.config.disabled")}
              </Label>
              <Switch id="cdp-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="write-key">{t("cdpManager.config.sourceWriteKey")}</Label>
              <div className="relative">
                <Input
                  id="write-key"
                  type={showKey ? "text" : "password"}
                  value={writeKey}
                  onChange={(e) => setWriteKey(e.target.value)}
                  placeholder={t("cdpManager.config.writeKeyPlaceholder")}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1 h-7 w-7"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="data-plane">{t("cdpManager.config.dataPlaneUrl")}</Label>
              <Input
                id="data-plane"
                value={dataPlaneUrl}
                onChange={(e) => setDataPlaneUrl(e.target.value)}
                placeholder={t("cdpManager.config.dataPlaneUrlPlaceholder")}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>{t("cdpManager.config.consentCategories")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("cdpManager.config.consentCategoriesDescription")}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {(config?.consentCategories ?? ["functional", "analytics", "marketing"]).map(
                (cat) => (
                  <Badge key={cat} variant="outline">
                    {cat}
                  </Badge>
                ),
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateConfig.isPending}>
              {updateConfig.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("cdpManager.config.saveConfiguration")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Destinations Tab
// ---------------------------------------------------------------------------

function DestinationsTab() {
  const { t } = useTranslation("admin");
  const { data, isLoading } = useCDPDestinations();
  const createDest = useCreateCDPDestination();
  const updateDest = useUpdateCDPDestination();
  const deleteDest = useDeleteCDPDestination();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [newApiKey, setNewApiKey] = useState("");

  const destinations = data?.destinations ?? [];

  const handleCreate = () => {
    const destType = DESTINATION_TYPES.find((d) => d.value === newType);
    if (!destType || !newName) return;

    createDest.mutate(
      {
        name: newName,
        type: destType.value,
        category: destType.category,
        config: newApiKey ? { apiKey: newApiKey } : {},
      },
      {
        onSuccess: () => {
          toast({ title: t("cdpManager.destinations.toasts.created", { name: newName }) });
          setDialogOpen(false);
          setNewName("");
          setNewType("");
          setNewApiKey("");
        },
        onError: () => {
          toast({
            title: t("cdpManager.destinations.toasts.createFailed"),
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleToggle = (id: string, currentEnabled: boolean) => {
    updateDest.mutate(
      { id, enabled: !currentEnabled },
      {
        onSuccess: () => {
          toast({
            title: currentEnabled
              ? t("cdpManager.destinations.toasts.disabled")
              : t("cdpManager.destinations.toasts.enabled"),
          });
        },
      },
    );
  };

  const handleDelete = (id: string, name: string) => {
    deleteDest.mutate(id, {
      onSuccess: () => {
        toast({ title: t("cdpManager.destinations.toasts.removed", { name }) });
      },
    });
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("cdpManager.destinations.description")}</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("cdpManager.destinations.addDestination")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("cdpManager.destinations.dialog.title")}</DialogTitle>
              <DialogDescription>
                {t("cdpManager.destinations.dialog.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("cdpManager.destinations.dialog.nameLabel")}</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("cdpManager.destinations.dialog.namePlaceholder")}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("cdpManager.destinations.dialog.typeLabel")}</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("cdpManager.destinations.dialog.typePlaceholder")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {DESTINATION_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("cdpManager.destinations.dialog.apiKeyLabel")}</Label>
                <Input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder={t("cdpManager.destinations.dialog.apiKeyPlaceholder")}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cdpManager.destinations.dialog.cancel")}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!newName || !newType || createDest.isPending}
              >
                {createDest.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("cdpManager.destinations.dialog.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {destinations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Send className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">{t("cdpManager.destinations.emptyTitle")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("cdpManager.destinations.emptyDescription")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {destinations.map((dest) => (
            <Card key={dest.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{dest.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleToggle(dest.id, dest.enabled)}
                    >
                      <Power
                        className={`h-4 w-4 ${dest.enabled ? "text-green-600" : "text-muted-foreground"}`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(dest.id, dest.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  {dest.enabled ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={dest.enabled ? "text-green-700" : "text-muted-foreground"}>
                    {dest.enabled
                      ? t("cdpManager.destinations.active")
                      : t("cdpManager.destinations.disabled")}
                  </span>
                  <Badge variant={CATEGORY_COLORS[dest.category] ?? "outline"} className="ml-auto">
                    {dest.category.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t("cdpManager.destinations.type")}:{" "}
                  {DESTINATION_TYPES.find((dt) => dt.value === dest.type)?.label ?? dest.type}
                </p>
                {dest.lastSyncAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("cdpManager.destinations.lastSync")}:{" "}
                    {new Date(dest.lastSyncAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Events Tab
// ---------------------------------------------------------------------------

function EventsTab() {
  const { t } = useTranslation("admin");
  const { data: eventsData, isLoading: eventsLoading } = useCDPRecentEvents({ limit: 25 });
  const { data: summaryData, isLoading: summaryLoading } = useCDPEventSummary("7d");

  const events = eventsData?.events ?? [];
  const summary = summaryData?.summary;

  if (eventsLoading || summaryLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{summary.totalEvents.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {t("cdpManager.events.totalEvents7d")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">
                {summary.delivered.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">{t("cdpManager.events.delivered")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">
                {summary.failed.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">{t("cdpManager.events.failed")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{(summary.deliveryRate * 100).toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{t("cdpManager.events.deliveryRate")}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Events */}
      {summary && summary.byEvent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t("cdpManager.events.topEvents")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.byEvent.slice(0, 10).map((e) => (
                <div key={e.name} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs">{e.name}</span>
                  <Badge variant="secondary">{e.count.toLocaleString()}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t("cdpManager.events.recentEvents")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("cdpManager.events.emptyMessage")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("cdpManager.events.table.event")}</TableHead>
                  <TableHead>{t("cdpManager.events.table.category")}</TableHead>
                  <TableHead>{t("cdpManager.events.table.status")}</TableHead>
                  <TableHead>{t("cdpManager.events.table.destinations")}</TableHead>
                  <TableHead>{t("cdpManager.events.table.time")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((evt) => (
                  <TableRow key={evt.id}>
                    <TableCell className="font-mono text-xs">{evt.eventName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {evt.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {evt.status === "delivered" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {evt.destinations.length > 0 ? evt.destinations.join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(evt.createdAt).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CDPManager() {
  const { t } = useTranslation("admin");
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Database className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{t("cdpManager.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("cdpManager.description")}</p>
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            {t("cdpManager.tabs.configuration")}
          </TabsTrigger>
          <TabsTrigger value="destinations" className="gap-2">
            <Send className="h-4 w-4" />
            {t("cdpManager.tabs.destinations")}
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <Activity className="h-4 w-4" />
            {t("cdpManager.tabs.events")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <ConfigTab />
        </TabsContent>
        <TabsContent value="destinations">
          <DestinationsTab />
        </TabsContent>
        <TabsContent value="events">
          <EventsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
