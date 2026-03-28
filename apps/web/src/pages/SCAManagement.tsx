import { useState } from "react";
import {
  Fingerprint,
  Smartphone,
  Shield,
  ShieldCheck,
  Monitor,
  Tablet,
  Trash2,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBankingDate } from "@/lib/common/date";
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import {
  useSCAConfig,
  useSCATrustedDevices,
  useBindSCADevice,
  useUnbindSCADevice,
} from "@/hooks/useSCA";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { SCAConfig, TrustedDevice, SCAMethod } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const deviceTypeIcons: Record<string, typeof Smartphone> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SCAManagement() {
  const { data: configData, isLoading: configLoading, error: configError } = useSCAConfig();
  const {
    data: devicesData,
    isLoading: devicesLoading,
    error: devicesError,
  } = useSCATrustedDevices();
  const bindDevice = useBindSCADevice();
  const unbindDevice = useUnbindSCADevice();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const [bindDialogOpen, setBindDialogOpen] = useState(false);
  const [bindForm, setBindForm] = useState({
    deviceName: "",
    deviceType: "" as string,
    platform: "",
  });
  const [confirmUnbind, setConfirmUnbind] = useState<string | null>(null);

  const config: SCAConfig | undefined = configData?.config;
  const devices: TrustedDevice[] = devicesData?.devices ?? [];

  const handleBind = async () => {
    if (!bindForm.deviceName.trim() || !bindForm.deviceType || !bindForm.platform.trim()) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    try {
      await bindDevice.mutateAsync({
        deviceName: bindForm.deviceName.trim(),
        deviceType: bindForm.deviceType,
        platform: bindForm.platform.trim(),
      });
      toast({ title: "Device bound", description: "New device has been registered for SCA." });
      setBindDialogOpen(false);
      setBindForm({ deviceName: "", deviceType: "", platform: "" });
    } catch (err) {
      handleError(err, { fallbackTitle: "Failed to bind device" });
    }
  };

  const handleUnbind = async (deviceId: string) => {
    try {
      await unbindDevice.mutateAsync(deviceId);
      toast({
        title: "Device removed",
        description: "The device has been unbound from your account.",
      });
      setConfirmUnbind(null);
    } catch (err) {
      handleError(err, { fallbackTitle: "Failed to remove device" });
    }
  };

  if (configLoading || devicesLoading) return <PageSkeleton />;

  if (configError || devicesError) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">Failed to load SCA settings</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Fingerprint className="h-6 w-6" />
          Strong Customer Authentication
        </h1>
        <p className="text-muted-foreground mt-1">
          Biometric-first authentication for international compliance with PSD2, PSD3, and Open
          Banking regulations.
        </p>
      </div>

      {/* SCA Config Card */}
      {config && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              SCA Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">SCA Enabled</span>
                <div className="mt-1">
                  <Badge variant={config.scaEnabled ? "default" : "destructive"}>
                    {config.scaEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Default Threshold</span>
                <p className="font-semibold mt-1">
                  &euro;{(config.defaultThresholdCents / 100).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Biometric Preferred</span>
                <p className="font-semibold mt-1">{config.biometricPreferred ? "Yes" : "No"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Challenge Expiry</span>
                <p className="font-semibold mt-1">{config.challengeExpirySeconds}s</p>
              </div>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Supported Methods</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {config.supportedMethods.map((method: SCAMethod) => (
                  <Badge key={method} variant="outline">
                    {method.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Linking Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Dynamic Linking</p>
              <p className="text-blue-700 mt-0.5">
                Payment authorization displays the exact amount and payee name on your
                authentication device, as required by PSD2/PSD3 regulations. This ensures you always
                know exactly what you are approving.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trusted Devices Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Trusted Devices</h2>
          <Dialog open={bindDialogOpen} onOpenChange={setBindDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Bind New Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bind New Device</DialogTitle>
                <DialogDescription>
                  Register a new device for Strong Customer Authentication.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Device Name</Label>
                  <Input
                    value={bindForm.deviceName}
                    onChange={(e) => setBindForm({ ...bindForm, deviceName: e.target.value })}
                    placeholder="My iPhone 15"
                  />
                </div>
                <div>
                  <Label>Device Type</Label>
                  <Select
                    value={bindForm.deviceType}
                    onValueChange={(v) => setBindForm({ ...bindForm, deviceType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile">Mobile</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                      <SelectItem value="desktop">Desktop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Platform</Label>
                  <Input
                    value={bindForm.platform}
                    onChange={(e) => setBindForm({ ...bindForm, platform: e.target.value })}
                    placeholder="iOS 17, Android 14, Windows 11..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBindDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBind} disabled={bindDevice.isPending}>
                  {bindDevice.isPending ? "Binding..." : "Bind Device"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {devices.length === 0 ? (
          <EmptyState
            icon={Smartphone}
            title="No trusted devices"
            description="Bind your first device to enable Strong Customer Authentication for payments and sensitive actions."
          />
        ) : (
          <div className="grid gap-3">
            {devices.map((device) => {
              const Icon = deviceTypeIcons[device.deviceType] ?? Monitor;

              return (
                <Card key={device.deviceId}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-muted p-2 mt-0.5">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{device.deviceName}</span>
                            {device.biometricCapable && (
                              <Badge variant="outline" className="text-green-700 border-green-300">
                                <Fingerprint className="h-3 w-3 mr-1" />
                                Biometric
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{device.platform}</span>
                            <span>Bound {formatBankingDate(device.boundAt)}</span>
                            {device.lastUsedAt && (
                              <span>Last used {formatBankingDate(device.lastUsedAt)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmUnbind(device.deviceId)}
                        title="Remove device"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Unbind Confirmation */}
      <AlertDialog
        open={!!confirmUnbind}
        onOpenChange={(o) => {
          if (!o) setConfirmUnbind(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unbind the device from your account. You will no longer be able to approve
              SCA challenges from this device. You can re-bind it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmUnbind && handleUnbind(confirmUnbind)}>
              Remove Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
