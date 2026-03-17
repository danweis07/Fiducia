import { useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  Smartphone,
  Tablet,
  Monitor,
  HelpCircle,
  Shield,
  ShieldOff,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Globe,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  useDevices,
  useRenameDevice,
  useRemoveDevice,
  useDeviceActivity,
  useTrustDevice,
  useUntrustDevice,
} from "@/hooks/useDevices";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { RegisteredDevice } from "@/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const deviceIcons: Record<string, typeof Smartphone> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
  unknown: HelpCircle,
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeviceManagement() {
  const { t } = useTranslation('banking');
  const { data, isLoading, error } = useDevices();
  const renameDevice = useRenameDevice();
  const removeDevice = useRemoveDevice();
  const trustDevice = useTrustDevice();
  const untrustDevice = useUntrustDevice();
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const [renameDialog, setRenameDialog] = useState<{ id: string; name: string } | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [expandedDevice, setExpandedDevice] = useState<string | null>(null);

  const devices = data?.devices ?? [];

  const handleRename = async () => {
    if (!renameDialog || !renameDialog.name.trim()) return;
    try {
      await renameDevice.mutateAsync({ deviceId: renameDialog.id, name: renameDialog.name.trim() });
      toast({ title: t('deviceManagement.deviceRenamed') });
      setRenameDialog(null);
    } catch (err) {
      handleError(err, { fallbackTitle: t('deviceManagement.renameFailed') });
    }
  };

  const handleRemove = async (deviceId: string) => {
    try {
      await removeDevice.mutateAsync(deviceId);
      toast({ title: t('deviceManagement.deviceRemoved'), description: t('deviceManagement.deviceRemovedDesc') });
      setConfirmRemove(null);
    } catch (err) {
      handleError(err, { fallbackTitle: t('deviceManagement.removeFailed') });
    }
  };

  const handleTrust = async (device: RegisteredDevice) => {
    try {
      if (device.isTrusted) {
        await untrustDevice.mutateAsync(device.id);
        toast({ title: t('deviceManagement.trustRemoved'), description: t('deviceManagement.trustRemovedDesc') });
      } else {
        await trustDevice.mutateAsync(device.id);
        toast({ title: t('deviceManagement.deviceTrusted'), description: t('deviceManagement.deviceTrustedDesc') });
      }
    } catch (err) {
      handleError(err, { fallbackTitle: t('deviceManagement.actionFailed') });
    }
  };

  if (isLoading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">{t('deviceManagement.failedToLoad')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('deviceManagement.title')}</h1>
        <p className="text-muted-foreground">{t('deviceManagement.subtitle')}</p>
      </div>

      {devices.length === 0 ? (
        <EmptyState icon={Monitor} title={t('deviceManagement.noDevices')} description={t('deviceManagement.noDevicesDesc')} />
      ) : (
        <div className="grid gap-4">
          {devices.map((device) => {
            const Icon = deviceIcons[device.deviceType] ?? HelpCircle;
            const isExpanded = expandedDevice === device.id;

            return (
              <Card key={device.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-muted p-2 mt-0.5">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{device.name}</span>
                          {device.isCurrent && <Badge variant="default">{t('deviceManagement.current')}</Badge>}
                          {device.isTrusted && <Badge variant="outline" className="text-green-700 border-green-300"><Shield className="h-3 w-3 mr-1" />{t('deviceManagement.trusted')}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{device.os}{device.browser ? ` / ${device.browser}` : ""}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelative(device.lastActiveAt)}</span>
                          {device.lastLocation && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{device.lastLocation}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleTrust(device)} title={device.isTrusted ? t('deviceManagement.removeTrust') : t('deviceManagement.trustDevice')}>
                        {device.isTrusted ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setRenameDialog({ id: device.id, name: device.name })} title={t('deviceManagement.rename')}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!device.isCurrent && (
                        <Button variant="ghost" size="icon" onClick={() => setConfirmRemove(device.id)} title={t('deviceManagement.removeDevice')}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setExpandedDevice(isExpanded ? null : device.id)} title={t('deviceManagement.activityLog')}>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expandable Activity Log */}
                  {isExpanded && <DeviceActivityLog deviceId={device.id} />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={!!renameDialog} onOpenChange={(o) => { if (!o) setRenameDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deviceManagement.renameDevice')}</DialogTitle>
            <DialogDescription>{t('deviceManagement.renameDeviceDesc')}</DialogDescription>
          </DialogHeader>
          <div>
            <Label>{t('deviceManagement.deviceName')}</Label>
            <Input
              value={renameDialog?.name ?? ""}
              onChange={(e) => renameDialog && setRenameDialog({ ...renameDialog, name: e.target.value })}
              placeholder={t('deviceManagement.deviceNamePlaceholder')}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>{t('deviceManagement.cancel')}</Button>
            <Button onClick={handleRename} disabled={renameDevice.isPending}>
              {renameDevice.isPending ? t('deviceManagement.saving') : t('deviceManagement.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!confirmRemove} onOpenChange={(o) => { if (!o) setConfirmRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deviceManagement.removeDeviceConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deviceManagement.removeDeviceConfirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deviceManagement.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRemove && handleRemove(confirmRemove)}>{t('deviceManagement.removeDevice')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Device Activity Log (expandable sub-section)
// ---------------------------------------------------------------------------

function DeviceActivityLog({ deviceId }: { deviceId: string }) {
  const { t } = useTranslation('banking');
  const { data, isLoading } = useDeviceActivity(deviceId);
  const activity = data?.activity ?? [];

  if (isLoading) {
    return <div className="mt-4 pl-10 text-sm text-muted-foreground">{t('deviceManagement.loadingActivity')}</div>;
  }

  if (activity.length === 0) {
    return <div className="mt-4 pl-10 text-sm text-muted-foreground">{t('deviceManagement.noRecentActivity')}</div>;
  }

  return (
    <div className="mt-4 pl-10 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground mb-2">{t('deviceManagement.recentActivity')}</p>
      <div className="space-y-2">
        {activity.slice(0, 10).map((entry) => (
          <div key={entry.id} className="flex items-center gap-3 text-sm">
            <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="flex-1">{entry.action}</span>
            <span className="text-muted-foreground text-xs">{entry.ipAddress}</span>
            {entry.location && <span className="text-muted-foreground text-xs">{entry.location}</span>}
            <span className="text-muted-foreground text-xs">{formatRelative(entry.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
