import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Upload, HelpCircle, BookOpen, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { AppShell } from "@/components/AppShell";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";
import { Spinner } from "@/components/common/Spinner";
import { EmptyState } from "@/components/common/EmptyState";

const CATEGORIES = [
  "General",
  "Accounts",
  "Transfers",
  "Loans",
  "Cards",
  "Fees",
  "Security",
  "Compliance",
];

export default function KnowledgeBase() {
  const { t } = useTranslation("admin");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");

  const { data: documentsData, isLoading: docsLoading } = useQuery({
    queryKey: ["ai-platform", "kb", "documents"],
    queryFn: () => gateway.aiPlatform.kb.list(),
  });

  const { data: gapsData, isLoading: gapsLoading } = useQuery({
    queryKey: ["ai-platform", "kb", "gaps"],
    queryFn: () => gateway.aiPlatform.kb.gaps(),
  });

  const uploadDocument = useMutation({
    mutationFn: (params: { title: string; content: string; category: string }) =>
      gateway.aiPlatform.kb.upload(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-platform", "kb", "documents"] });
      setUploadOpen(false);
      resetForm();
      toast({
        title: t("knowledgeBase.toasts.documentUploaded"),
        description: t("knowledgeBase.toasts.documentUploadedDesc"),
      });
    },
    onError: () => {
      toast({ title: t("knowledgeBase.toasts.uploadFailed"), variant: "destructive" });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: (documentId: string) => gateway.aiPlatform.kb.remove(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-platform", "kb", "documents"] });
      toast({ title: t("knowledgeBase.toasts.documentDeleted") });
    },
    onError: () => {
      toast({ title: t("knowledgeBase.toasts.deleteFailed"), variant: "destructive" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("");
  };

  const documents = documentsData?.documents ?? [];
  const gaps = gapsData?.gaps ?? [];

  return (
    <AppShell>
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{t("knowledgeBase.title")}</h2>
              <p className="text-muted-foreground">{t("knowledgeBase.description")}</p>
            </div>

            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("knowledgeBase.uploadDocument")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t("knowledgeBase.uploadDialog.title")}</DialogTitle>
                  <DialogDescription>
                    {t("knowledgeBase.uploadDialog.description")}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-title">{t("knowledgeBase.uploadDialog.titleLabel")}</Label>
                    <Input
                      id="doc-title"
                      placeholder={t("knowledgeBase.uploadDialog.titlePlaceholder")}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-category">
                      {t("knowledgeBase.uploadDialog.categoryLabel")}
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("knowledgeBase.uploadDialog.categoryPlaceholder")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat.toLowerCase()}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-content">
                      {t("knowledgeBase.uploadDialog.contentLabel")}
                    </Label>
                    <Textarea
                      id="doc-content"
                      placeholder={t("knowledgeBase.uploadDialog.contentPlaceholder")}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setUploadOpen(false);
                      resetForm();
                    }}
                  >
                    {t("knowledgeBase.uploadDialog.cancel")}
                  </Button>
                  <Button
                    onClick={() => uploadDocument.mutate({ title, content, category })}
                    disabled={
                      !title.trim() || !content.trim() || !category || uploadDocument.isPending
                    }
                  >
                    {uploadDocument.isPending
                      ? t("knowledgeBase.uploadDialog.uploading")
                      : t("knowledgeBase.uploadDialog.upload")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Tabs defaultValue="documents">
            <TabsList>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 mr-2" />
                {t("knowledgeBase.tabs.documents")}
              </TabsTrigger>
              <TabsTrigger value="gaps">
                <HelpCircle className="h-4 w-4 mr-2" />
                {t("knowledgeBase.tabs.knowledgeGaps")}
              </TabsTrigger>
            </TabsList>

            {/* Documents Tab */}
            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {t("knowledgeBase.documents.indexedTitle")}
                  </CardTitle>
                  <CardDescription>
                    {t("knowledgeBase.documents.indexedDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {docsLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : documents.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title={t("knowledgeBase.documents.emptyTitle")}
                      description={t("knowledgeBase.documents.emptyDescription")}
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("knowledgeBase.documents.table.title")}</TableHead>
                          <TableHead>{t("knowledgeBase.documents.table.category")}</TableHead>
                          <TableHead>{t("knowledgeBase.documents.table.status")}</TableHead>
                          <TableHead>{t("knowledgeBase.documents.table.created")}</TableHead>
                          <TableHead className="w-[60px]" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map(
                          (doc: {
                            id: string;
                            title: string;
                            category: string;
                            status: string;
                            createdAt: string;
                          }) => (
                            <TableRow key={doc.id}>
                              <TableCell className="font-medium">{doc.title}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {doc.category}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <StatusBadge status={doc.status} />
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteDocument.mutate(doc.id)}
                                  disabled={deleteDocument.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ),
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Knowledge Gaps Tab */}
            <TabsContent value="gaps" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <HelpCircle className="h-4 w-4" />
                    {t("knowledgeBase.gaps.title")}
                  </CardTitle>
                  <CardDescription>{t("knowledgeBase.gaps.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {gapsLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : gaps.length === 0 ? (
                    <EmptyState
                      icon={HelpCircle}
                      title={t("knowledgeBase.gaps.emptyTitle")}
                      description={t("knowledgeBase.gaps.emptyDescription")}
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("knowledgeBase.gaps.table.question")}</TableHead>
                          <TableHead className="w-[120px] text-right">
                            {t("knowledgeBase.gaps.table.occurrences")}
                          </TableHead>
                          <TableHead className="w-[140px]">
                            {t("knowledgeBase.gaps.table.lastAsked")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gaps.map(
                          (gap: {
                            id: string;
                            query: string;
                            occurrenceCount: number;
                            lastAskedAt: string;
                            resolved: boolean;
                          }) => (
                            <TableRow key={gap.id}>
                              <TableCell>{gap.query}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary">{gap.occurrenceCount}</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {new Date(gap.lastAskedAt).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ),
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </AppShell>
  );
}
