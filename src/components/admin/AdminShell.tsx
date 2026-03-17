import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Plug,
  Palette,
  ShieldCheck,
  BarChart3,
  FileText,
  Settings,
  Menu,
  ChevronRight,
  LogOut,
  Building2,
  Newspaper,
  KeyRound,
  FlaskConical,
  Shield,
  Bot,
  Download,
  Rocket,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Accounts", path: "/admin/accounts", icon: Wallet },
  { label: "Integrations", path: "/admin/integrations", icon: Plug },
  { label: "Branding", path: "/admin/branding", icon: Palette },
  { label: "Compliance", path: "/admin/compliance", icon: ShieldCheck },
  { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { label: "Content", path: "/admin/content", icon: Newspaper },
  { label: "API Tokens", path: "/admin/api-tokens", icon: KeyRound },
  { label: "Experiments", path: "/admin/experiments", icon: FlaskConical },
  { label: "SSO", path: "/admin/sso", icon: Shield },
  { label: "AI Assistant", path: "/admin/ai-assistant", icon: Bot },
  { label: "Data Export", path: "/admin/data-export", icon: Download },
  { label: "Onboarding", path: "/admin/onboarding", icon: Rocket },
  { label: "CDP", path: "/admin/cdp", icon: Database },
  { label: "Audit Log", path: "/admin/audit", icon: FileText },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

function getBreadcrumbs(pathname: string): { label: string; path?: string }[] {
  const crumbs: { label: string; path?: string }[] = [{ label: "Admin", path: "/admin" }];
  const match = navItems.find((item) =>
    item.end ? pathname === item.path : pathname.startsWith(item.path)
  );
  if (match && match.path !== "/admin") {
    crumbs.push({ label: match.label });
  }
  return crumbs;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-5">
        <Building2 className="h-6 w-6 text-slate-300" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">Admin Console</p>
          <p className="text-xs text-slate-400 truncate">Demo Credit Union</p>
        </div>
      </div>
      <Separator className="bg-slate-700" />
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-0.5 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </ScrollArea>
      <Separator className="bg-slate-700" />
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
            JD
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">Jane Doe</p>
            <p className="text-xs text-slate-400 truncate">Admin</p>
          </div>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function AdminShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-slate-900 border-r border-slate-800 shrink-0">
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-3 border-b bg-white px-4 py-3 md:px-6 shrink-0">
          {/* Mobile menu button */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0 bg-slate-900 border-slate-800">
              <SidebarContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <span key={crumb.label} className="contents">
                    {i > 0 && (
                      <BreadcrumbSeparator>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </BreadcrumbSeparator>
                    )}
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.path}>{crumb.label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </span>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
