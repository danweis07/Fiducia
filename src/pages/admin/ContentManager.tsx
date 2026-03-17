import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Send,
  Archive,
  Globe,
  Smartphone,
  Mail,
  Bell,
  MessageSquare,
  Monitor,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatBankingDate } from "@/lib/common/date";
import { gateway } from "@/lib/gateway";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import type { CMSContent, CMSChannel, CMSContentType } from "@/types/admin";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CONTENT_TYPES: { value: CMSContentType; label: string }[] = [
  { value: "article", label: "Article" },
  { value: "announcement", label: "Announcement" },
  { value: "banner", label: "Banner" },
  { value: "faq", label: "FAQ" },
  { value: "legal", label: "Legal" },
  { value: "promotion", label: "Promotion" },
];

function channelIcon(slug: string) {
  switch (slug) {
    case "web_portal":
      return <Globe className="h-3.5 w-3.5" />;
    case "mobile_app":
      return <Smartphone className="h-3.5 w-3.5" />;
    case "email":
      return <Mail className="h-3.5 w-3.5" />;
    case "push":
      return <Bell className="h-3.5 w-3.5" />;
    case "sms":
      return <MessageSquare className="h-3.5 w-3.5" />;
    case "atm_screen":
      return <Monitor className="h-3.5 w-3.5" />;
    default:
      return <Globe className="h-3.5 w-3.5" />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ContentManager() {
  const { t } = useTranslation("admin");
  const [content, setContent] = useState<CMSContent[]>([]);
  const [channels, setChannels] = useState<CMSChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CMSContent | null>(null);
  const [form, setForm] = useState({
    slug: "",
    title: "",
    body: "",
    contentType: "article" as CMSContentType,
    channels: [] as string[],
    scheduledAt: "",
    expiresAt: "",
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [contentRes, channelsRes] = await Promise.all([
        gateway.cms.listContent({
          ...(filterStatus !== "all" ? { status: filterStatus } : {}),
          ...(filterType !== "all" ? { contentType: filterType } : {}),
          ...(filterChannel !== "all" ? { channel: filterChannel } : {}),
        }),
        gateway.cms.listChannels(),
      ]);
      setContent(contentRes.content);
      setChannels(channelsRes.channels);
    } catch {
      // silent
    }
    setIsLoading(false);
  }, [filterStatus, filterType, filterChannel]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingItem(null);
    setForm({
      slug: "",
      title: "",
      body: "",
      contentType: "article",
      channels: [],
      scheduledAt: "",
      expiresAt: "",
    });
    setEditorOpen(true);
  };

  const openEdit = (item: CMSContent) => {
    setEditingItem(item);
    setForm({
      slug: item.slug,
      title: item.title,
      body: item.body,
      contentType: item.contentType,
      channels: item.channels,
      scheduledAt: item.scheduledAt || "",
      expiresAt: item.expiresAt || "",
    });
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (editingItem) {
      await gateway.cms.updateContent(editingItem.id, {
        slug: form.slug,
        title: form.title,
        body: form.body,
        contentType: form.contentType,
        channels: form.channels,
        scheduledAt: form.scheduledAt || null,
        expiresAt: form.expiresAt || null,
      });
    } else {
      await gateway.cms.createContent({
        slug: form.slug,
        title: form.title,
        body: form.body,
        contentType: form.contentType,
        channels: form.channels,
        scheduledAt: form.scheduledAt || undefined,
        expiresAt: form.expiresAt || undefined,
      });
    }
    setEditorOpen(false);
    loadData();
  };

  const handlePublish = async (id: string) => {
    await gateway.cms.publishContent(id);
    loadData();
  };

  const handleArchive = async (id: string) => {
    await gateway.cms.archiveContent(id);
    loadData();
  };

  const handleDelete = async (id: string) => {
    await gateway.cms.deleteContent(id);
    loadData();
  };

  const toggleChannel = (slug: string) => {
    setForm((prev) => ({
      ...prev,
      channels: prev.channels.includes(slug)
        ? prev.channels.filter((c) => c !== slug)
        : [...prev.channels, slug],
    }));
  };

  // -------------------------------------------------------------------------
  // Stats
  // -------------------------------------------------------------------------
  const published = content.filter((c) => c.status === "published").length;
  const drafts = content.filter((c) => c.status === "draft").length;
  const scheduled = content.filter((c) => c.status === "scheduled").length;
  const activeChannels = channels.filter((c) => c.isActive).length;

  if (isLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("contentManager.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("contentManager.subtitle", { count: activeChannels })}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t("contentManager.newContent")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t("contentManager.stats.published")}</p>
            <p className="text-2xl font-bold text-green-600">{published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t("contentManager.stats.drafts")}</p>
            <p className="text-2xl font-bold text-slate-600">{drafts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">{t("contentManager.stats.scheduled")}</p>
            <p className="text-2xl font-bold text-blue-600">{scheduled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">
              {t("contentManager.stats.activeChannels")}
            </p>
            <p className="text-2xl font-bold">{activeChannels}</p>
          </CardContent>
        </Card>
      </div>

      {/* Channels Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("contentManager.deliveryChannels")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {channels.map((ch) => (
              <Badge
                key={ch.id}
                variant={ch.isActive ? "default" : "secondary"}
                className="gap-1.5 px-3 py-1"
              >
                {channelIcon(ch.slug)}
                {ch.label}
                {!ch.isActive && <span className="text-xs opacity-60">(off)</span>}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder={t("contentManager.filters.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("contentManager.filters.allStatuses")}</SelectItem>
            <SelectItem value="draft">{t("contentManager.filters.draft")}</SelectItem>
            <SelectItem value="scheduled">{t("contentManager.filters.scheduled")}</SelectItem>
            <SelectItem value="published">{t("contentManager.filters.published")}</SelectItem>
            <SelectItem value="archived">{t("contentManager.filters.archived")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder={t("contentManager.filters.type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("contentManager.filters.allTypes")}</SelectItem>
            {CONTENT_TYPES.map((ct) => (
              <SelectItem key={ct.value} value={ct.value}>
                {ct.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterChannel} onValueChange={setFilterChannel}>
          <SelectTrigger className="w-[150px] h-8 text-xs">
            <SelectValue placeholder={t("contentManager.filters.channel")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("contentManager.filters.allChannels")}</SelectItem>
            {channels.map((ch) => (
              <SelectItem key={ch.slug} value={ch.slug}>
                {ch.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content List */}
      <div className="space-y-3">
        {content.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p>{t("contentManager.noContent")}</p>
            </CardContent>
          </Card>
        )}
        {content.map((item) => (
          <Card key={item.id} className="hover:border-primary/30 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={item.status} className="text-xs" />
                    <Badge variant="outline" className="text-xs">
                      {item.contentType}
                    </Badge>
                    <span className="text-xs text-muted-foreground">v{item.version}</span>
                  </div>
                  <h3 className="font-semibold truncate">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    /{item.slug} &middot; {item.locale.toUpperCase()}
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {item.body.replace(/[#*_[\]]/g, "").slice(0, 140)}
                    {item.body.length > 140 ? "..." : ""}
                  </p>

                  {/* Channel badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {item.channels.map((slug) => {
                      const ch = channels.find((c) => c.slug === slug);
                      return (
                        <span
                          key={slug}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs"
                        >
                          {channelIcon(slug)}
                          {ch?.label || slug}
                        </span>
                      );
                    })}
                  </div>

                  {/* Dates */}
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    {item.publishedAt && (
                      <span>
                        {t("contentManager.publishedDate", {
                          date: formatBankingDate(item.publishedAt),
                        })}
                      </span>
                    )}
                    {item.scheduledAt && (
                      <span className="text-blue-600">
                        {t("contentManager.scheduledDate", {
                          date: formatBankingDate(item.scheduledAt),
                        })}
                      </span>
                    )}
                    {item.expiresAt && (
                      <span className="text-amber-600">
                        {t("contentManager.expiresDate", {
                          date: formatBankingDate(item.expiresAt),
                        })}
                      </span>
                    )}
                    {!item.publishedAt && !item.scheduledAt && (
                      <span>
                        {t("contentManager.createdDate", {
                          date: formatBankingDate(item.createdAt),
                        })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEdit(item)}
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {item.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-600"
                      onClick={() => handlePublish(item.id)}
                      title="Publish"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {item.status === "published" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-amber-600"
                      onClick={() => handleArchive(item.id)}
                      title="Archive"
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => handleDelete(item.id)}
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? t("contentManager.dialog.editContent")
                : t("contentManager.dialog.newContent")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("contentManager.dialog.slug")}</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="url-friendly-slug"
                />
              </div>
              <div>
                <Label>{t("contentManager.dialog.contentType")}</Label>
                <Select
                  value={form.contentType}
                  onValueChange={(v) => setForm({ ...form, contentType: v as CMSContentType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t("contentManager.dialog.titleLabel")}</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t("contentManager.dialog.titlePlaceholder")}
              />
            </div>

            <div>
              <Label>{t("contentManager.dialog.body")}</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder={t("contentManager.dialog.bodyPlaceholder")}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            <div>
              <Label className="mb-2 block">{t("contentManager.dialog.targetChannels")}</Label>
              <div className="flex flex-wrap gap-2">
                {channels
                  .filter((ch) => ch.isActive)
                  .map((ch) => (
                    <Button
                      key={ch.slug}
                      variant={form.channels.includes(ch.slug) ? "default" : "outline"}
                      size="sm"
                      className="gap-1.5"
                      onClick={() => toggleChannel(ch.slug)}
                    >
                      {channelIcon(ch.slug)}
                      {ch.label}
                    </Button>
                  ))}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("contentManager.dialog.schedulePublish")}</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduledAt ? form.scheduledAt.slice(0, 16) : ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("contentManager.dialog.scheduleHint")}
                </p>
              </div>
              <div>
                <Label>{t("contentManager.dialog.expiresAt")}</Label>
                <Input
                  type="datetime-local"
                  value={form.expiresAt ? form.expiresAt.slice(0, 16) : ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      expiresAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("contentManager.dialog.expiresHint")}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>
              {t("contentManager.dialog.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!form.slug || !form.title}>
              {editingItem
                ? t("contentManager.dialog.saveChanges")
                : t("contentManager.dialog.createDraft")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
