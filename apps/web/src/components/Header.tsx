import { Bell, Settings, LogOut, User, Menu } from "lucide-react";
import { elevation } from "@/lib/common/design-tokens";
import { Button } from "@/components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/TenantContext";
import { useTranslation } from "react-i18next";
import {
  primaryNavItems,
  overflowNavItems,
  filterNavItems,
  groupNavItems,
  NAV_GROUP_LABELS,
} from "@/lib/nav-config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { user, tenant, tenantRecord, isAuthenticated, signOut } = useAuth();
  const { t } = useTranslation("banking");

  const displayName = tenant?.displayName || user?.email?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();
  const tenantName = tenant?.tenantName || "Digital Banking";

  // Filter nav items based on tenant features and region
  const visiblePrimary = filterNavItems(primaryNavItems, tenant?.features, tenant?.region);
  const visibleOverflow = filterNavItems(overflowNavItems, tenant?.features, tenant?.region);
  const allNavItems = [...visiblePrimary, ...visibleOverflow];

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <header
      className={`h-14 md:h-16 bg-primary flex items-center justify-between px-4 md:px-6 flex-shrink-0 ${elevation.header}`}
    >
      {/* Left: Mobile menu + Logo */}
      <div className="flex items-center gap-3 md:gap-6">
        {/* Mobile hamburger */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white/80 hover:text-white hover:bg-white/10"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px]">
            <SheetHeader>
              <SheetTitle>{tenantName}</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              {allNavItems.map((item) => (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={currentPath === item.path ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3"
                  >
                    <item.icon className="w-4 h-4" />
                    {t(item.labelKey)}
                  </Button>
                </Link>
              ))}
              <div className="my-2 border-t" />
              <Link to="/settings">
                <Button
                  variant={currentPath === "/settings" ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3"
                >
                  <Settings className="w-4 h-4" />
                  {t("nav.settings")}
                </Button>
              </Link>
            </nav>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden">
            {tenantRecord?.logoUrl ? (
              <img
                src={tenantRecord.logoUrl}
                alt={tenantName}
                className="w-full h-full object-contain p-0.5"
              />
            ) : (
              <span className="text-white font-bold text-sm md:text-base">{initial}</span>
            )}
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg md:text-xl tracking-tight text-white">{tenantName}</h1>
            <p className="text-[10px] md:text-[11px] text-white/60 -mt-0.5">
              {t("nav.digitalBanking")}
            </p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {visiblePrimary.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant="ghost"
                size="sm"
                className={
                  currentPath === item.path ||
                  (item.path === "/move-money" &&
                    ["/transfer", "/bills", "/deposit"].includes(currentPath))
                    ? "bg-white/15 text-white font-medium hover:bg-white/20 hover:text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }
              >
                <item.icon className="w-4 h-4 mr-2" />
                {t(item.labelKey)}
              </Button>
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={
                  visibleOverflow.some((item) => currentPath === item.path)
                    ? "bg-white/15 text-white font-medium hover:bg-white/20 hover:text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }
              >
                <Menu className="w-4 h-4 mr-2" />
                {t("nav.more")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 max-h-[70vh] overflow-y-auto">
              {Array.from(groupNavItems(visibleOverflow).entries()).map(
                ([group, items], gi, arr) => (
                  <div key={group}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t(NAV_GROUP_LABELS[group])}
                    </div>
                    {items.map((item) => (
                      <DropdownMenuItem
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        className={currentPath === item.path ? "bg-accent" : ""}
                      >
                        <item.icon className="w-4 h-4 mr-2" />
                        {t(item.labelKey)}
                      </DropdownMenuItem>
                    ))}
                    {gi < arr.length - 1 && <DropdownMenuSeparator />}
                  </div>
                ),
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>

      {/* Right: Notifications + User menu */}
      <div className="flex items-center gap-2 md:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="relative text-white/70 hover:text-white hover:bg-white/10"
          onClick={() => navigate("/notifications")}
          aria-label={t("nav.notifications")}
        >
          <Bell className="w-4 h-4" />
          <span
            className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"
            aria-hidden="true"
          />
        </Button>

        {/* User Menu */}
        <div className="hidden md:block">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 rounded-full"
                >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold text-white">
                    {initial}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="w-4 h-4 mr-2" />
                  {t("nav.settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t("nav.signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <User className="w-4 h-4 mr-2" />
                {t("nav.signIn")}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
