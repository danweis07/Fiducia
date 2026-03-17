import { useState, useEffect, useRef } from "react";
import { useTranslation } from 'react-i18next';
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Upload, Search, Download, Trash2, Edit2, FolderOpen, Grid3X3, List, FileIcon } from "lucide-react";
import { useVaultDocuments, useUploadDocument, useVaultDocument, useUpdateVaultDocument, useDeleteVaultDocument, useVaultSummary, useSearchVaultDocuments } from "@/hooks/useDocumentVault";
import { useToast } from "@/hooks/use-toast";
import type { VaultDocumentCategory, VaultDocument } from "@/types";

const CATEGORIES: { value: VaultDocumentCategory; label: string }[] = [
  { value: "tax_form", label: "Tax Forms" },
  { value: "statement", label: "Statements" },
  { value: "receipt", label: "Receipts" },
  { value: "insurance", label: "Insurance" },
  { value: "legal", label: "Legal" },
  { value: "identification", label: "Identification" },
  { value: "other", label: "Other" },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export default function DocumentVaultPage() {
  const { t } = useTranslation('banking');
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState<VaultDocumentCategory | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailDocId, setDetailDocId] = useState<string | undefined>(undefined);
  const [editOpen, setEditOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<VaultDocument | null>(null);

  const { data: docsData, isLoading } = useVaultDocuments({ category: categoryFilter });
  const documents = docsData?.documents ?? [];
  const { data: summaryData } = useVaultSummary();
  const summary = summaryData?.summary;
  const { data: searchData } = useSearchVaultDocuments({ query: searchQuery || undefined, category: categoryFilter });
  const searchResults = searchQuery ? (searchData?.documents ?? []) : documents;
  const { data: detailData } = useVaultDocument(detailDocId);
  const uploadDocument = useUploadDocument();
  const updateDocument = useUpdateVaultDocument();
  const deleteDocument = useDeleteVaultDocument();

  // Upload form state
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState<VaultDocumentCategory>("other");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<VaultDocumentCategory>("other");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");

  const handleUpload = () => {
    if (!uploadName) { toast({ title: t('documentVault.nameRequired'), variant: "destructive" }); return; }
    uploadDocument.mutate({
      name: uploadName,
      category: uploadCategory,
      description: uploadDescription || undefined,
      tags: uploadTags ? uploadTags.split(",").map(t => t.trim()).filter(Boolean) : undefined,
    }, {
      onSuccess: () => {
        toast({ title: t('documentVault.documentUploaded') });
        setUploadOpen(false);
        setUploadName(""); setUploadDescription(""); setUploadTags("");
      },
      onError: () => toast({ title: t('documentVault.uploadFailed'), variant: "destructive" }),
    });
  };

  const openEdit = (doc: VaultDocument) => {
    setEditDoc(doc);
    setEditName(doc.name);
    setEditCategory(doc.category);
    setEditDescription(doc.description ?? "");
    setEditTags(doc.tags.join(", "));
    setEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editDoc) return;
    updateDocument.mutate({
      documentId: editDoc.id,
      name: editName,
      category: editCategory,
      description: editDescription || undefined,
      tags: editTags ? editTags.split(",").map(t => t.trim()).filter(Boolean) : [],
    }, {
      onSuccess: () => { toast({ title: t('documentVault.documentUpdated') }); setEditOpen(false); },
      onError: () => toast({ title: t('documentVault.updateFailed'), variant: "destructive" }),
    });
  };

  const handleDelete = (id: string) => {
    deleteDocument.mutate(id, {
      onSuccess: () => toast({ title: t('documentVault.documentDeleted') }),
    });
  };

  // Track pending download — when detailData arrives with a URL, open it
  const pendingDownloadRef = useRef<string | null>(null);

  const handleDownload = (doc: VaultDocument) => {
    // If we already have the detail for this doc, open immediately
    if (detailData?.document?.id === doc.id && detailData.document.downloadUrl) {
      window.open(detailData.document.downloadUrl, "_blank");
      return;
    }
    // Otherwise, trigger the detail fetch and mark as pending
    pendingDownloadRef.current = doc.id;
    setDetailDocId(doc.id);
  };

  useEffect(() => {
    if (
      pendingDownloadRef.current &&
      detailData?.document?.id === pendingDownloadRef.current &&
      detailData.document.downloadUrl
    ) {
      window.open(detailData.document.downloadUrl, "_blank");
      pendingDownloadRef.current = null;
    }
  }, [detailData]);

  const displayDocs = searchQuery ? searchResults : documents;
  const getCategoryLabel = (c: VaultDocumentCategory) => CATEGORIES.find(cat => cat.value === c)?.label ?? c;

  return (
    <AppShell>
      <main id="main-content" className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-primary" />
              {t('documentVault.title')}
            </h1>
            <p className="text-muted-foreground mt-1">{t('documentVault.subtitle')}</p>
          </div>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button><Upload className="w-4 h-4 mr-2" />{t('documentVault.uploadDocument')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('documentVault.uploadDocument')}</DialogTitle>
                <DialogDescription>{t('documentVault.uploadDocumentDesc')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t('documentVault.documentName')}</Label>
                  <Input value={uploadName} onChange={e => setUploadName(e.target.value)} placeholder={t('documentVault.documentNamePlaceholder')} />
                </div>
                <div className="space-y-2">
                  <Label>{t('documentVault.category')}</Label>
                  <Select value={uploadCategory} onValueChange={v => setUploadCategory(v as VaultDocumentCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('documentVault.descriptionOptional')}</Label>
                  <Textarea value={uploadDescription} onChange={e => setUploadDescription(e.target.value)} placeholder={t('documentVault.descriptionPlaceholder')} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>{t('documentVault.tagsOptional')}</Label>
                  <Input value={uploadTags} onChange={e => setUploadTags(e.target.value)} placeholder={t('documentVault.tagsPlaceholder')} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUploadOpen(false)}>{t('documentVault.cancel')}</Button>
                <Button onClick={handleUpload} disabled={uploadDocument.isPending}>
                  {uploadDocument.isPending ? t('documentVault.uploading') : t('documentVault.upload')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold">{summary.totalDocuments}</p>
                <p className="text-sm text-muted-foreground">{t('documentVault.totalDocuments')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-2xl font-bold">{formatFileSize(summary.totalSizeBytes)}</p>
                <p className="text-sm text-muted-foreground">{t('documentVault.totalSize')}</p>
              </CardContent>
            </Card>
            {Object.entries(summary.byCategory).slice(0, 2).map(([cat, count]) => (
              <Card key={cat}>
                <CardContent className="pt-6">
                  <p className="text-2xl font-bold">{count as number}</p>
                  <p className="text-sm text-muted-foreground capitalize">{(cat as string).replace(/_/g, " ")}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Search + Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={t('documentVault.searchPlaceholder')}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter ?? "all"} onValueChange={v => setCategoryFilter(v === "all" ? undefined : v as VaultDocumentCategory)}>
            <SelectTrigger className="w-full md:w-48"><SelectValue placeholder={t('documentVault.allCategories')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('documentVault.allCategories')}</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}><List className="w-4 h-4" /></Button>
            <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}><Grid3X3 className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('documentVault.editDocument')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('documentVault.name')}</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('documentVault.category')}</Label>
                <Select value={editCategory} onValueChange={v => setEditCategory(v as VaultDocumentCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('documentVault.description')}</Label>
                <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>{t('documentVault.tags')}</Label>
                <Input value={editTags} onChange={e => setEditTags(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>{t('documentVault.cancel')}</Button>
              <Button onClick={handleUpdate} disabled={updateDocument.isPending}>{t('documentVault.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document List / Grid */}
        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">{t('documentVault.loadingDocuments')}</CardContent></Card>
        ) : displayDocs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">{t('documentVault.noDocuments')}</p>
              <Button className="mt-4" onClick={() => setUploadOpen(true)}><Upload className="w-4 h-4 mr-2" />{t('documentVault.uploadFirstDocument')}</Button>
            </CardContent>
          </Card>
        ) : viewMode === "list" ? (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('documentVault.name')}</TableHead>
                  <TableHead>{t('documentVault.category')}</TableHead>
                  <TableHead>{t('documentVault.size')}</TableHead>
                  <TableHead>{t('documentVault.tags')}</TableHead>
                  <TableHead>{t('documentVault.uploaded')}</TableHead>
                  <TableHead className="w-32">{t('documentVault.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayDocs.map((doc: VaultDocument) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <FileIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      {doc.name}
                    </TableCell>
                    <TableCell><Badge variant="outline">{getCategoryLabel(doc.category)}</Badge></TableCell>
                    <TableCell>{formatFileSize(doc.fileSizeBytes)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">{doc.tags.slice(0, 3).map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>
                    </TableCell>
                    <TableCell>{new Date(doc.uploadedAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)} title={t('documentVault.download')}><Download className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(doc)} title={t('documentVault.edit')}><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)} title={t('documentVault.delete')}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayDocs.map((doc: VaultDocument) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <FileIcon className="w-8 h-8 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(doc.fileSizeBytes)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{getCategoryLabel(doc.category)}</Badge>
                  <div className="flex gap-1 pt-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)}><Download className="w-3 h-3 mr-1" />{t('documentVault.download')}</Button>
                    <Button variant="ghost" size="icon" className="ml-auto" onClick={() => openEdit(doc)}><Edit2 className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
