/**
 * AppShell Layout Component
 *
 * Wraps Header and MobileBottomNav for consistent page layout.
 * Supports both children and React Router <Outlet /> for layout routes.
 */

import { Outlet } from "react-router-dom";
import { Header } from "@/components/Header";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { ChatWidget } from "@/components/common/ChatWidget";

interface AppShellProps {
  children?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden pb-16 md:pb-0">
      <OfflineBanner />
      <Header />
      {children ?? <Outlet />}
      <MobileBottomNav />
      <ChatWidget />
    </div>
  );
}
