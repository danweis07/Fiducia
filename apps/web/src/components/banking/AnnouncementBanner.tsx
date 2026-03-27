import { useState, useEffect } from "react";
import { X, Megaphone, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { gateway } from "@/lib/gateway";

interface Announcement {
  id: string;
  title: string;
  body: string;
  contentType: "announcement" | "banner";
  metadata: {
    severity?: "info" | "warning" | "critical";
    dismissible?: boolean;
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

const SEVERITY_STYLES = {
  info: "bg-blue-50 border-blue-200 text-blue-900",
  warning: "bg-amber-50 border-amber-200 text-amber-900",
  critical: "bg-red-50 border-red-200 text-red-900",
};

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertTriangle,
};

export function AnnouncementBanner() {
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedIds);

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
    (a) => !dismissedIds.includes(a.id),
  );

  function handleDismiss(id: string) {
    dismissAnnouncement(id);
    setDismissedIds([...dismissedIds, id]);
  }

  if (announcements.length === 0) return null;

  return (
    <div className="space-y-0">
      {announcements.map((announcement) => {
        const severity = announcement.metadata?.severity ?? "info";
        const dismissible = announcement.metadata?.dismissible !== false;
        const Icon = SEVERITY_ICONS[severity];

        return (
          <div
            key={announcement.id}
            className={`border-b px-4 py-2.5 flex items-center gap-3 ${SEVERITY_STYLES[severity]}`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium">{announcement.title}</span>
              {announcement.body && (
                <span className="text-sm ml-2 opacity-80">{announcement.body}</span>
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
