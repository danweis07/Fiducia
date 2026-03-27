import { useState } from "react";
import {
  X,
  Megaphone,
  AlertTriangle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

interface Announcement {
  id: string;
  title: string;
  body: string;
  contentType: "announcement" | "banner";
  metadata: {
    severity?: "info" | "warning" | "success" | "migration";
    dismissible?: boolean;
    expiresAt?: string;
  };
}

const DISMISSED_KEY = "fiducia_dismissed_announcements";

function getDismissedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function dismissAnnouncement(id: string) {
  const ids = getDismissedIds();
  if (!ids.includes(id)) {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids, id]));
  }
}

function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

/** Render markdown-like bold (**text**) as <strong> elements. */
function renderBoldText(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
  );
}

const SEVERITY_STYLES: Record<string, string> = {
  info: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200",
  warning:
    "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200",
  success:
    "bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-200",
  migration:
    "bg-purple-50 border-purple-200 text-purple-900 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-200",
};

const SEVERITY_ICONS: Record<string, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle2,
  migration: Megaphone,
};

export default function AnnouncementBanner() {
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedIds);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const announcementsQuery = useQuery({
    queryKey: ["announcements"],
    queryFn: () =>
      gateway.request<{ data: Announcement[] }>("content.list", {
        contentType: "announcement",
        status: "published",
      }),
    staleTime: 60_000,
  });

  const announcements = (announcementsQuery.data?.data ?? []).filter(
    (a) => !dismissedIds.includes(a.id) && !isExpired(a.metadata?.expiresAt),
  );

  function handleDismiss(id: string) {
    dismissAnnouncement(id);
    setDismissedIds([...dismissedIds, id]);
  }

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-0">
      {announcements.map((announcement) => {
        const severity = announcement.metadata?.severity ?? "info";
        const dismissible = announcement.metadata?.dismissible !== false;
        const Icon = SEVERITY_ICONS[severity] ?? Info;
        const styles = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info;
        const isLongBody = announcement.body && announcement.body.length > 120;
        const isExpanded = expandedIds.has(announcement.id);

        return (
          <div
            key={announcement.id}
            className={`border-b px-4 py-2.5 flex items-start gap-3 ${styles}`}
          >
            <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">{renderBoldText(announcement.title)}</span>
              {announcement.body && (
                <>
                  <span className="text-sm ml-2 opacity-80">
                    {isLongBody && !isExpanded
                      ? renderBoldText(announcement.body.slice(0, 120) + "...")
                      : renderBoldText(announcement.body)}
                  </span>
                  {isLongBody && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1 ml-1 text-xs opacity-70 hover:opacity-100"
                      onClick={() => toggleExpand(announcement.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
            {dismissible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => handleDismiss(announcement.id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
