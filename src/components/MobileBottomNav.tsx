import { Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/TenantContext";
import {
  mobilePrimaryNavItems,
  mobileMoreItems,
  filterNavItems,
  groupNavItems,
  NAV_GROUP_LABELS,
} from "@/lib/nav-config";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function MobileBottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [open, setOpen] = useState(false);
  const { t } = useTranslation("banking");
  const { tenant } = useAuth();

  // Filter nav items based on tenant features and region
  const visiblePrimary = filterNavItems(mobilePrimaryNavItems, tenant?.features, tenant?.region);
  const visibleMore = filterNavItems(mobileMoreItems, tenant?.features, tenant?.region);

  const isMoreActive = visibleMore.some((item) => currentPath === item.path);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {visiblePrimary.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className={cn("text-[10px] font-medium", isActive && "text-primary")}>
                {t(item.labelKey)}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-10 h-0.5 bg-primary rounded-t-full" />
              )}
            </Link>
          );
        })}

        {/* More menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
                isMoreActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Menu className={cn("w-5 h-5", isMoreActive && "text-primary")} />
              <span className={cn("text-[10px] font-medium", isMoreActive && "text-primary")}>
                {t("nav.more")}
              </span>
              {isMoreActive && (
                <div className="absolute bottom-0 w-10 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{t("nav.more")}</SheetTitle>
            </SheetHeader>
            <nav className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {Array.from(groupNavItems(visibleMore).entries()).map(([group, items]) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                    {t(NAV_GROUP_LABELS[group])}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {items.map((item) => (
                      <Link key={item.path} to={item.path} onClick={() => setOpen(false)}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full h-auto flex-col gap-2 py-3",
                            currentPath === item.path && "bg-primary/10 text-primary",
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="text-[11px] font-medium">{t(item.labelKey)}</span>
                        </Button>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
