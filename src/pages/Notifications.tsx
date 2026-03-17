import { useTranslation } from "react-i18next";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBankingDateTime } from "@/lib/common/date";
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useUnreadCount,
} from "@/hooks/useNotifications";
import { PageSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";

const typeColor: Record<string, string> = {
  transaction: "bg-blue-100 text-blue-700",
  transfer: "bg-indigo-100 text-indigo-700",
  bill_due: "bg-yellow-100 text-yellow-700",
  rdc_status: "bg-purple-100 text-purple-700",
  card_alert: "bg-orange-100 text-orange-700",
  security: "bg-red-100 text-red-700",
  system: "bg-gray-100 text-gray-700",
  promotional: "bg-green-100 text-green-700",
};

export default function Notifications() {
  const { t } = useTranslation("banking");
  const { data, isLoading, error } = useNotifications();
  const { data: unreadData } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = unreadData?.count ?? 0;

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-destructive font-medium">{t("notifications.failedToLoad")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("notifications.title")}</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? t("notifications.unreadCount", { count: unreadCount })
              : t("notifications.allCaughtUp")}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            {t("notifications.markAllRead")}
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t("notifications.noNotifications")}
          description={t("notifications.noNotificationsDesc")}
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`transition-colors ${!n.isRead ? "border-primary/30 bg-primary/5" : ""}`}
            >
              <CardContent className="flex items-start gap-4 py-4">
                <div
                  className={`rounded-full p-2 mt-0.5 shrink-0 ${typeColor[n.type] ?? "bg-gray-100 text-gray-700"}`}
                >
                  <Bell className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm ${!n.isRead ? "font-semibold" : "font-medium"}`}>
                        {n.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                    </div>
                    {!n.isRead && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      {formatBankingDateTime(n.createdAt)}
                    </span>
                    <Badge variant="outline" className="text-[10px] py-0 capitalize">
                      {n.type.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                {!n.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    disabled={markRead.isPending}
                    onClick={() => markRead.mutate(n.id)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
