"use client";

import React, { useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs";
import type { RoleEnum } from "@/lib/auth";

interface AppLayoutProps {
  children: React.ReactNode;
  allowedRoles?: RoleEnum[];
  breadcrumbs?: BreadcrumbItem[];
}

export function AppLayout({ children, allowedRoles, breadcrumbs }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      <div className="min-h-screen flex flex-col bg-zinc-100/60 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
        <AppHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        <div className="flex-1 flex">
          <AppSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 flex flex-col min-w-0 p-4 md:p-8">
            <div className="mb-6">
              <Breadcrumbs items={breadcrumbs} />
            </div>

            <div className="flex-1">{children}</div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
