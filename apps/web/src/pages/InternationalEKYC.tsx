import { useState } from "react";
import { UserCheck, Camera, Globe, Clock, Play, Scan } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from "@/hooks/use-toast";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import {
  useEKYCProviders,
  useEKYCVerifications,
  useInitiateEKYC,
  useStartLiveness,
  useCompleteLiveness,
} from "@/hooks/useEKYC";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type {
  EKYCProviderConfig,
  EKYCVerification,
  EKYCVerificationStatus,
  LivenessCheckStatus,
} from "@/types";

// ---------------------------------------------------------------------------
// Status badge config
// ---------------------------------------------------------------------------

const verificationStatusConfig: Record<
  EKYCVerificationStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  verified: { label: "Verified", variant: "default" },
  pending: { label: "Pending", variant: "outline" },
  in_progress: { label: "In Progress", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  expired: { label: "Expired", variant: "outline" },
  manual_review: { label: "Manual Review", variant: "secondary" },
};

const livenessStatusConfig: Record<
  LivenessCheckStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  not_started: { label: "Not Started", variant: "outline" },
  in_progress: { label: "In Progress", variant: "secondary" },
  passed: { label: "Passed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

const countryOptions = [
  { value: "IN", label: "India" },
  { value: "BR", label: "Brazil" },
  { value: "GB", label: "United Kingdom" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InternationalEKYC() {
  const { toast } = useToast();
  const { handleError } = useErrorHandler();

  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const { data: providersData, isLoading: providersLoading } = useEKYCProviders(
    selectedCountry || undefined,
  );
  const {
    data: verificationsData,
    isLoading: verificationsLoading,
    error: verificationsError,
  } = useEKYCVerifications();
  const initiateMutation = useInitiateEKYC();
  const startLivenessMutation = useStartLiveness();
  const _completeLivenessMutation = useCompleteLiveness();

  const [initiateDialog, setInitiateDialog] = useState<EKYCProviderConfig | null>(null);
  const [initiateForm, setInitiateForm] = useState({
    documentType: "",
    documentNumber: "",
  });

  const providers: EKYCProviderConfig[] = providersData?.providers ?? [];
  const verifications: EKYCVerification[] = verificationsData?.verifications ?? [];

  const handleInitiate = async () => {
    if (
      !initiateDialog ||
      !initiateForm.documentType.trim() ||
      !initiateForm.documentNumber.trim()
    ) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    try {
      await initiateMutation.mutateAsync({
        providerId: initiateDialog.providerId,
        country: initiateDialog.country,
        documentType: initiateForm.documentType.trim(),
        documentNumber: initiateForm.documentNumber.trim(),
      });
      toast({
        title: "Verification initiated",
        description: "Your identity verification has been started.",
      });
      setInitiateDialog(null);
      setInitiateForm({ documentType: "", documentNumber: "" });
    } catch (err) {
      handleError(err, { fallbackTitle: "Failed to initiate verification" });
    }
  };

  const handleStartLiveness = async (verificationId: string) => {
    try {
      await startLivenessMutation.mutateAsync(verificationId);
      toast({
        title: "Liveness check started",
        description: "Follow the on-screen instructions to complete verification.",
      });
    } catch (err) {
      handleError(err, { fallbackTitle: "Failed to start liveness check" });
    }
  };

  if (verificationsLoading) return <PageSkeleton />;

  if (verificationsError) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">Failed to load verification data</p>
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
          <UserCheck className="h-6 w-6" />
          Identity Verification
        </h1>
        <p className="text-muted-foreground mt-1">
          Complete international eKYC requirements with document verification and biometric liveness
          checks.
        </p>
      </div>

      {/* Country / Provider Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Select Country &amp; Provider
          </CardTitle>
          <CardDescription>
            Choose your country to see available identity verification providers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Country</Label>
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countryOptions.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCountry && providersLoading && (
            <div className="text-sm text-muted-foreground">Loading providers...</div>
          )}

          {selectedCountry && !providersLoading && providers.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No providers available for this country.
            </div>
          )}

          {selectedCountry && providers.length > 0 && (
            <div className="grid gap-3">
              {providers.map((provider) => (
                <Card key={provider.providerId} className="border">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{provider.displayName}</span>
                          {provider.supportsLiveness && (
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              <Camera className="h-3 w-3 mr-1" />
                              Liveness
                            </Badge>
                          )}
                          {provider.supportsBiometric && (
                            <Badge variant="outline" className="text-blue-700 border-blue-300">
                              <Scan className="h-3 w-3 mr-1" />
                              Biometric
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{provider.description}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Estimated time: {provider.estimatedTime}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setInitiateDialog(provider);
                          setInitiateForm({ documentType: "", documentNumber: "" });
                        }}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start Verification
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Liveness Check Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <Camera className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Liveness Verification</p>
              <p className="text-blue-700 mt-0.5">
                Liveness verification requires you to perform specific actions such as blinking,
                smiling, or turning your head. This confirms that a real person is present and
                prevents spoofing with photos or videos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Verification History */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Verification History</h2>

        {verifications.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No verifications"
            description="Select a country and provider above to start your first identity verification."
          />
        ) : (
          <div className="grid gap-3">
            {verifications.map((verification) => {
              const statusCfg = verificationStatusConfig[verification.status];
              const livenessCfg = livenessStatusConfig[verification.livenessStatus];

              return (
                <Card key={verification.id}>
                  <CardContent className="py-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{verification.providerName}</span>
                          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                          <Badge variant={livenessCfg.variant}>{livenessCfg.label}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {verification.country}
                          </span>
                          <span>{verification.documentType}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {verification.verifiedAt && (
                            <span>
                              Verified {new Date(verification.verifiedAt).toLocaleDateString()}
                            </span>
                          )}
                          {verification.failedAt && (
                            <span>
                              Failed {new Date(verification.failedAt).toLocaleDateString()}
                            </span>
                          )}
                          {!verification.verifiedAt &&
                            !verification.failedAt &&
                            verification.createdAt && (
                              <span>
                                Started {new Date(verification.createdAt).toLocaleDateString()}
                              </span>
                            )}
                        </div>
                      </div>

                      {verification.livenessStatus === "not_started" &&
                        verification.status === "in_progress" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartLiveness(verification.id)}
                            disabled={startLivenessMutation.isPending}
                          >
                            <Camera className="h-4 w-4 mr-1" />
                            Start Liveness Check
                          </Button>
                        )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Initiate Dialog */}
      <Dialog
        open={!!initiateDialog}
        onOpenChange={(open) => {
          if (!open) setInitiateDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Identity Verification</DialogTitle>
            <DialogDescription>
              {initiateDialog && (
                <>
                  Verify your identity with {initiateDialog.displayName} (
                  {countryOptions.find((c) => c.value === initiateDialog.country)?.label ??
                    initiateDialog.country}
                  ).
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Type</Label>
              <Input
                value={initiateForm.documentType}
                onChange={(e) => setInitiateForm({ ...initiateForm, documentType: e.target.value })}
                placeholder="Passport, National ID, Driver's License..."
              />
            </div>
            <div>
              <Label>Document Number</Label>
              <Input
                value={initiateForm.documentNumber}
                onChange={(e) =>
                  setInitiateForm({ ...initiateForm, documentNumber: e.target.value })
                }
                placeholder="Enter document number"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your document number will be masked in all displays and logs for security.
              </p>
            </div>
            {initiateDialog?.estimatedTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Estimated processing time: {initiateDialog.estimatedTime}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInitiateDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleInitiate} disabled={initiateMutation.isPending}>
              {initiateMutation.isPending ? "Initiating..." : "Start Verification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
