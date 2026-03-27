import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Save, Loader2, ChevronLeft, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  useMigrationBatch,
  useMappingTemplates,
  useSaveMappingTemplate,
} from "@/hooks/useDataMigration";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import type { FieldMapping, FieldTransform } from "@/types/migration";

const TRANSFORMS: { value: FieldTransform; label: string }[] = [
  { value: "none", label: "None" },
  { value: "uppercase", label: "Uppercase" },
  { value: "lowercase", label: "Lowercase" },
  { value: "trim", label: "Trim whitespace" },
  { value: "date_iso", label: "Date → ISO 8601" },
  { value: "date_us", label: "Date → US format" },
  { value: "cents_to_dollars", label: "Cents → Dollars" },
  { value: "dollars_to_cents", label: "Dollars → Cents" },
  { value: "boolean_yn", label: "Y/N → Boolean" },
  { value: "phone_normalize", label: "Phone normalize" },
  { value: "ssn_mask", label: "SSN mask" },
];

const TARGET_FIELDS: Record<string, string[]> = {
  members: [
    "member_number",
    "first_name",
    "last_name",
    "email",
    "phone",
    "date_of_birth",
    "ssn_masked",
    "address_line1",
    "address_line2",
    "city",
    "state",
    "zip",
    "country",
  ],
  accounts: [
    "account_number",
    "member_reference",
    "account_type",
    "balance_cents",
    "opened_at",
    "status",
    "routing_number",
    "nickname",
  ],
  transactions: [
    "transaction_id",
    "account_reference",
    "amount_cents",
    "type",
    "description",
    "posted_date",
    "effective_date",
    "category",
    "merchant_name",
  ],
  payees: [
    "payee_name",
    "account_number",
    "routing_number",
    "address",
    "member_reference",
    "category",
  ],
  cards: [
    "card_number_masked",
    "member_reference",
    "account_reference",
    "card_type",
    "status",
    "expiry_date",
    "daily_limit_cents",
  ],
  loans: [
    "loan_number",
    "member_reference",
    "loan_type",
    "principal_cents",
    "interest_rate",
    "term_months",
    "origination_date",
    "maturity_date",
    "status",
  ],
};

export default function SchemaMapper() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const batchQuery = useMigrationBatch(batchId ?? "");
  const templatesQuery = useMappingTemplates();
  const saveMutation = useSaveMappingTemplate();

  const [templateName, setTemplateName] = useState("");
  const [mappings, setMappings] = useState<FieldMapping[]>([
    { sourceField: "", targetField: "", transform: "none" },
  ]);

  if (batchQuery.isLoading) return <PageSkeleton />;

  const batch = batchQuery.data?.batch;
  const templates = templatesQuery.data?.data ?? [];
  const targetFields = TARGET_FIELDS[batch?.entityType ?? "members"] ?? TARGET_FIELDS.members;

  function addMapping() {
    setMappings([...mappings, { sourceField: "", targetField: "", transform: "none" }]);
  }

  function removeMapping(idx: number) {
    setMappings(mappings.filter((_, i) => i !== idx));
  }

  function updateMapping(idx: number, updates: Partial<FieldMapping>) {
    setMappings(mappings.map((m, i) => (i === idx ? { ...m, ...updates } : m)));
  }

  function loadTemplate(templateId: string) {
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setMappings(tmpl.fieldMappings);
      setTemplateName(tmpl.name);
      toast({
        title: "Template loaded",
        description: `Loaded "${tmpl.name}" with ${tmpl.fieldMappings.length} field mappings.`,
      });
    }
  }

  function handleSave() {
    if (!templateName) {
      toast({
        title: "Name required",
        description: "Enter a template name.",
        variant: "destructive",
      });
      return;
    }
    const validMappings = mappings.filter((m) => m.sourceField && m.targetField);
    if (validMappings.length === 0) {
      toast({
        title: "No mappings",
        description: "Add at least one field mapping.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(
      {
        name: templateName,
        sourceSystem: batch?.sourceSystem ?? "Unknown",
        entityType: batch?.entityType ?? "members",
        fieldMappings: validMappings,
      },
      { onSuccess: () => toast({ title: "Template saved" }) },
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/data-migration")}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Schema Mapper</h1>
          <p className="text-muted-foreground">
            {batch
              ? `${batch.label} — ${batch.sourceSystem} → Fiducia`
              : "Configure field mappings"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar: load template */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Load Template</CardTitle>
            <CardDescription>Use a saved mapping template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.map((tmpl) => (
              <Button
                key={tmpl.id}
                variant="outline"
                size="sm"
                className="w-full justify-start text-left"
                onClick={() => loadTemplate(tmpl.id)}
              >
                <span className="truncate">{tmpl.name}</span>
              </Button>
            ))}
            {templates.length === 0 && (
              <p className="text-xs text-muted-foreground">No saved templates yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Main: field mappings */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Field Mappings</CardTitle>
                <CardDescription>
                  Map source fields from {batch?.sourceSystem ?? "your export"} to Fiducia schema
                  fields
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addMapping}>
                <Plus className="h-4 w-4 mr-1" />
                Add Field
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source Field</TableHead>
                  <TableHead className="w-8" />
                  <TableHead>Target Field</TableHead>
                  <TableHead>Transform</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input
                        placeholder="e.g. MemberID"
                        value={mapping.sourceField}
                        onChange={(e) => updateMapping(idx, { sourceField: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.targetField}
                        onValueChange={(v) => updateMapping(idx, { targetField: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target" />
                        </SelectTrigger>
                        <SelectContent>
                          {targetFields.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={mapping.transform ?? "none"}
                        onValueChange={(v) =>
                          updateMapping(idx, { transform: v as FieldTransform })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRANSFORMS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Optional"
                        value={mapping.defaultValue ?? ""}
                        onChange={(e) =>
                          updateMapping(idx, { defaultValue: e.target.value || undefined })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeMapping(idx)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex items-center gap-4 mt-6 pt-4 border-t">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Save as template</Label>
                <Input
                  placeholder="Template name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                />
              </div>
              <Button onClick={handleSave} disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
