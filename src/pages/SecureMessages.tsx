import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageSquare, Plus, Send, Archive, ArrowLeft, Circle, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import {
  useMessageThreads,
  useThread,
  useCreateThread,
  useReplyToThread,
  useArchiveThread,
  useMessageDepartments,
  useUnreadMessageCount,
} from "@/hooks/useSecureMessaging";
import { relativeTime, formatBankingDateTime } from "@/lib/common/date";
import type { MessageThread } from "@/types";

// ---------------------------------------------------------------------------
// New Thread Dialog
// ---------------------------------------------------------------------------
function NewThreadDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const { t } = useTranslation("banking");
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");

  const { data: deptData } = useMessageDepartments();
  const createThread = useCreateThread();

  const departments = deptData?.departments ?? [];

  const handleSubmit = () => {
    if (!subject.trim() || !body.trim()) return;
    createThread.mutate(
      {
        subject: subject.trim(),
        body: body.trim(),
        departmentId: departmentId || undefined,
        priority,
      },
      {
        onSuccess: (data) => {
          setOpen(false);
          setSubject("");
          setBody("");
          setDepartmentId("");
          setPriority("normal");
          onCreated(data.thread.id);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          {t("secureMessages.newMessage")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("secureMessages.newSecureMessage")}</DialogTitle>
          <DialogDescription>{t("secureMessages.newSecureMessageDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              {t("secureMessages.subject")}
            </label>
            <Input
              placeholder={t("secureMessages.subjectPlaceholder")}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                {t("secureMessages.department")}
              </label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("secureMessages.general")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("secureMessages.general")}</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                {t("secureMessages.priority")}
              </label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "normal" | "urgent")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">{t("secureMessages.normal")}</SelectItem>
                  <SelectItem value="urgent">{t("secureMessages.urgent")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              {t("secureMessages.message")}
            </label>
            <Textarea
              placeholder={t("secureMessages.messagePlaceholder")}
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel", { ns: "common" })}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!subject.trim() || !body.trim() || createThread.isPending}
          >
            {createThread.isPending ? t("secureMessages.sending") : t("secureMessages.sendMessage")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Thread List Item
// ---------------------------------------------------------------------------
function ThreadListItem({
  thread,
  isSelected,
  onClick,
}: {
  thread: MessageThread;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation("banking");
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 border-b border-border transition-colors hover:bg-muted/50 ${
        isSelected ? "bg-muted" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            {thread.unreadCount > 0 && (
              <Circle className="w-2 h-2 fill-primary text-primary flex-shrink-0" />
            )}
            <span
              className={`text-sm truncate ${
                thread.unreadCount > 0 ? "font-semibold" : "font-medium"
              }`}
            >
              {thread.subject}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {thread.departmentName && <span className="truncate">{thread.departmentName}</span>}
            {thread.priority === "urgent" && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                {t("secureMessages.urgent")}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[11px] text-muted-foreground">
            {relativeTime(thread.lastMessageAt)}
          </span>
          {thread.unreadCount > 0 && (
            <Badge className="h-5 min-w-[20px] flex items-center justify-center text-[10px] px-1.5">
              {thread.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Message View
// ---------------------------------------------------------------------------
function MessageView({ threadId, onBack }: { threadId: string; onBack: () => void }) {
  const { t } = useTranslation("banking");
  const { data, isLoading, error } = useThread(threadId);
  const replyMutation = useReplyToThread();
  const archiveMutation = useArchiveThread();
  const [replyText, setReplyText] = useState("");

  const thread = data?.thread;
  const messages = data?.messages ?? [];

  const handleReply = () => {
    if (!replyText.trim()) return;
    replyMutation.mutate(
      { threadId, body: replyText.trim() },
      { onSuccess: () => setReplyText("") },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReply();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t("secureMessages.loadingConversation")}</p>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">{t("secureMessages.failedToLoadConversation")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{thread.subject}</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {thread.departmentName && <span>{thread.departmentName}</span>}
            {thread.priority === "urgent" && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                <AlertTriangle className="w-3 h-3 mr-0.5" />
                {t("secureMessages.urgent")}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">
              {thread.status}
            </Badge>
          </div>
        </div>
        {thread.status !== "archived" && (
          <Button
            variant="ghost"
            size="icon"
            title={t("secureMessages.archiveThread")}
            onClick={() => {
              archiveMutation.mutate(threadId, { onSuccess: onBack });
            }}
          >
            <Archive className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 max-w-2xl mx-auto">
          {messages.map((msg) => {
            const isOwnMessage = msg.senderType === "member";
            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                    isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium opacity-80">{msg.senderName}</span>
                    <span className="text-[10px] opacity-60">
                      {formatBankingDateTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Reply input */}
      {thread.status !== "archived" && (
        <div className="p-4 border-t border-border">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <Textarea
              placeholder={t("secureMessages.replyPlaceholder")}
              rows={1}
              className="resize-none min-h-[40px]"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              size="icon"
              onClick={handleReply}
              disabled={!replyText.trim() || replyMutation.isPending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function SecureMessages() {
  const { t } = useTranslation("banking");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const { data, isLoading, error } = useMessageThreads();
  const { data: unreadData } = useUnreadMessageCount();

  const threads = data?.threads ?? [];
  const unreadCount = unreadData?.count ?? 0;

  const handleThreadCreated = (id: string) => {
    setSelectedThreadId(id);
  };

  if (isLoading) {
    return (
      <AppShell>
        <PageSkeleton />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-destructive font-medium">{t("secureMessages.failedToLoad")}</p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main id="main-content" className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col max-w-6xl mx-auto px-4 py-4 md:py-6">
          {/* Page header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h1 className="text-lg md:text-xl font-bold">{t("secureMessages.title")}</h1>
              {unreadCount > 0 && (
                <Badge variant="secondary">
                  {t("secureMessages.unread", { count: unreadCount })}
                </Badge>
              )}
            </div>
            <NewThreadDialog onCreated={handleThreadCreated} />
          </div>

          {/* Content area: thread list + message view */}
          <Card className="flex-1 overflow-hidden">
            <div className="flex h-full">
              {/* Thread list (sidebar) */}
              <div
                className={`w-full md:w-80 lg:w-96 border-r border-border flex-shrink-0 flex flex-col ${
                  selectedThreadId ? "hidden md:flex" : "flex"
                }`}
              >
                <CardHeader className="p-3 pb-2 border-b border-border">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {t("secureMessages.conversations", { count: threads.length })}
                  </CardTitle>
                </CardHeader>
                <ScrollArea className="flex-1">
                  {threads.length === 0 ? (
                    <div className="p-6">
                      <EmptyState
                        icon={MessageSquare}
                        title={t("secureMessages.noMessages")}
                        description={t("secureMessages.noMessagesDesc")}
                      />
                    </div>
                  ) : (
                    threads.map((thread) => (
                      <ThreadListItem
                        key={thread.id}
                        thread={thread}
                        isSelected={thread.id === selectedThreadId}
                        onClick={() => setSelectedThreadId(thread.id)}
                      />
                    ))
                  )}
                </ScrollArea>
              </div>

              {/* Message view (right panel) */}
              <div className={`flex-1 min-w-0 ${!selectedThreadId ? "hidden md:flex" : "flex"}`}>
                {selectedThreadId ? (
                  <MessageView
                    threadId={selectedThreadId}
                    onBack={() => setSelectedThreadId(null)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                    <MessageSquare className="w-10 h-10 opacity-30" />
                    <p className="text-sm">{t("secureMessages.selectConversation")}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </main>
    </AppShell>
  );
}
