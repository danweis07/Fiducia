import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useAcceptTerms } from "@/hooks/useActivation";
import type { ActivationConfig } from "@/types/activation";

export function StepTerms({
  config,
  activationToken,
  onComplete,
  onBack,
}: {
  config: ActivationConfig;
  activationToken: string;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [acceptedDocs, setAcceptedDocs] = useState<Set<string>>(new Set());
  const acceptTerms = useAcceptTerms();

  const mandatoryDocs = config.terms.filter((d) => d.mandatory);
  const allMandatoryAccepted = mandatoryDocs.every((d) => acceptedDocs.has(d.id));

  const toggleAcceptance = (docId: string) => {
    setAcceptedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const handleSubmit = () => {
    const acceptances = config.terms
      .filter((d) => acceptedDocs.has(d.id))
      .map((d) => ({ documentId: d.id, version: d.version }));

    acceptTerms.mutate(
      { activationToken, acceptances },
      { onSuccess: () => onComplete() }
    );
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" aria-hidden="true" />
          Terms &amp; Disclosures
        </CardTitle>
        <CardDescription>
          Please read and accept the following documents to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {config.terms.map((doc) => (
          <div key={doc.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium text-sm">{doc.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    v{doc.version}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Published {new Date(doc.publishedAt).toLocaleDateString()}
                  </span>
                  {doc.mandatory && (
                    <Badge variant="outline" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div
              className="max-h-48 overflow-y-auto rounded border bg-muted/30 p-3 text-xs leading-relaxed"
              role="document"
              aria-label={`${doc.title} content`}
              tabIndex={0}
              dangerouslySetInnerHTML={{ __html: doc.content }}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id={`accept-${doc.id}`}
                checked={acceptedDocs.has(doc.id)}
                onCheckedChange={() => toggleAcceptance(doc.id)}
                aria-label={`I have read and agree to ${doc.title}`}
              />
              <Label htmlFor={`accept-${doc.id}`} className="text-sm cursor-pointer">
                I have read and agree to {doc.title} (Version {doc.version})
              </Label>
            </div>
          </div>
        ))}
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
        <Button
          className="min-h-[44px] gap-2"
          onClick={handleSubmit}
          disabled={!allMandatoryAccepted || acceptTerms.isPending}
          aria-label="Accept terms and continue"
        >
          {acceptTerms.isPending ? "Submitting..." : "Accept & Continue"}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}
