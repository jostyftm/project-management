"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoadingPage from "@/components/common/loadingPage";
import { PlaneSidebar } from "@/components/plane/PlaneSidebar";
import { NotificationBell } from "@/components/plane/notifications/NotificationBell";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { LOGIN_ROUTE } from "@/config/constants";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { initWorkspaceFromStorage } = useWorkspaceStore();

  useEffect(() => {
    initWorkspaceFromStorage();
  }, [initWorkspaceFromStorage]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push(LOGIN_ROUTE);
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <LoadingPage />;
  }

  return (
    <SidebarProvider>
      <PlaneSidebar />
      <SidebarInset className="bg-slate-50 flex flex-col min-h-screen">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1 cursor-pointer text-slate-600 hover:text-slate-900" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
              <span>Plane Workspace</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/instance-admin"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg transition-all"
            >
              <ShieldCheck className="size-3.5 text-indigo-600" />
              <span>Gobernanza</span>
            </Link>
            <NotificationBell />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
