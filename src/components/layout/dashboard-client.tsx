"use client";

import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatPanel } from "@/components/chat/chat-panel";
import { CallOverlay } from "@/components/call/call-overlay";
import { OrgAdminPanel } from "@/components/admin/org-admin-panel";
import { TenantAdminPanel } from "@/components/admin/tenant-admin-panel";
import { SocketInit } from "@/components/socket-init";

export function DashboardClient() {
  const { data: session } = useSession();
  const role = session?.user?.role;

  // Tenant admin: manage organizations only (no chat/call)
  if (role === "tenant_admin") {
    return <TenantAdminPanel />;
  }

  // Org admin: manage users/departments only (no chat/call)
  if (role === "admin") {
    return <OrgAdminPanel />;
  }

  // Employee: full chat + call experience
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SocketInit />
      <Sidebar />
      <div className="relative flex flex-1 flex-col">
        <ChatPanel />
      </div>
      <CallOverlay />
    </div>
  );
}
