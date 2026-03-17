import { useTranslation } from "react-i18next";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowLeft,
  FileText,
  Upload,
  CheckCircle2,
} from "lucide-react";

export function DocumentsStep({
  selectedLoanType,
  documents,
  onDocumentUpload,
  onNext,
  onBack,
}: {
  selectedLoanType: string;
  documents: Array<{ name: string; uploaded: boolean }>;
  onDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation("banking");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> {t("loanApplication.supportingDocuments")}
        </CardTitle>
        <CardDescription>
          {t("loanApplication.supportingDocumentsDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{t("loanApplication.recommendedDocuments")}</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>{t("loanApplication.docPhotoId")}</li>
            <li>{t("loanApplication.docProofOfIncome")}</li>
            <li>{t("loanApplication.docProofOfAddress")}</li>
            {selectedLoanType === "auto" && <li>{t("loanApplication.docVehicleInfo")}</li>}
            {selectedLoanType === "mortgage" && <li>{t("loanApplication.docPropertyInfo")}</li>}
          </ul>
        </div>

        <div className="border-2 border-dashed rounded-lg p-8 text-center">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            {t("loanApplication.dragAndDrop")}
          </p>
          <label htmlFor="doc-upload">
            <Button variant="outline" size="sm" asChild>
              <span>{t("loanApplication.chooseFiles")}</span>
            </Button>
          </label>
          <input
            id="doc-upload"
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={onDocumentUpload}
            className="hidden"
          />
        </div>

        {documents.length > 0 && (
          <div className="space-y-2">
            {documents.map((doc, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-sm p-2 rounded bg-muted/50"
              >
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{doc.name}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> {t("loanApplication.back")}
        </Button>
        <Button onClick={onNext}>
          {documents.length === 0 ? t("loanApplication.skipForNow") : t("loanApplication.continue")}{" "}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
