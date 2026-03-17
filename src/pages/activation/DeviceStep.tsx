import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Smartphone,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useRegisterDevice } from "@/hooks/useActivation";
import type { ActivationConfig } from "@/types/activation";
import { detectDevice } from "./constants";

export function StepDevice({
  config,
  activationToken,
  onComplete,
  onBack,
  onSkip,
}: {
  config: ActivationConfig;
  activationToken: string;
  onComplete: () => void;
  onBack: () => void;
  onSkip?: () => void;
}) {
  const deviceInfo = useMemo(() => detectDevice(), []);
  const [deviceName, setDeviceName] = useState(deviceInfo.defaultName);
  const registerDevice = useRegisterDevice();

  const handleSubmit = () => {
    registerDevice.mutate(
      {
        activationToken,
        device: {
          deviceId: crypto.randomUUID(),
          userAgent: deviceInfo.userAgent,
          platform: deviceInfo.platform,
          screenResolution: deviceInfo.screenResolution,
          timezone: deviceInfo.timezone,
          language: deviceInfo.language,
        },
        deviceName,
      },
      { onSuccess: () => onComplete() }
    );
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" aria-hidden="true" />
          Register This Device
        </CardTitle>
        <CardDescription>
          Register this device as trusted so you won&apos;t need to verify it each time you
          sign in.
          {!config.device.required && " This step is optional."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
          <h4 className="text-sm font-medium">Detected Device Information</h4>
          <div className="grid grid-cols-2 gap-y-1 text-xs text-muted-foreground">
            <span>Platform:</span>
            <span>{deviceInfo.platform}</span>
            <span>Screen:</span>
            <span>{deviceInfo.screenResolution}</span>
            <span>Timezone:</span>
            <span>{deviceInfo.timezone}</span>
            <span>Language:</span>
            <span>{deviceInfo.language}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="device-name">Device Name</Label>
          <Input
            id="device-name"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            className="min-h-[44px]"
            aria-label="Name for this device"
            placeholder="e.g. My Laptop"
          />
          <p className="text-xs text-muted-foreground">
            This name helps you identify this device later. Trust expires after{" "}
            {config.device.trustDurationDays} days.
          </p>
        </div>

        {registerDevice.isError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            Failed to register device. Please try again.
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          className="min-h-[44px] gap-2"
          onClick={onBack}
          aria-label="Go back to previous step"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </Button>
        <div className="flex gap-2">
          {!config.device.required && onSkip && (
            <Button
              variant="ghost"
              className="min-h-[44px]"
              onClick={onSkip}
              aria-label="Skip device registration"
            >
              Skip
            </Button>
          )}
          <Button
            className="min-h-[44px] gap-2"
            onClick={handleSubmit}
            disabled={!deviceName.trim() || registerDevice.isPending}
            aria-label="Register device and continue"
          >
            {registerDevice.isPending ? "Registering..." : "Register Device"}
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
