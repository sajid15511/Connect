"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/use-socket";
import { useAppStore } from "@/stores/app-store";

/**
 * Initializes socket connection and fetches initial data once authenticated.
 * Renders nothing visible — place near the root of the authenticated layout.
 */
export function SocketInit() {
  const { data: session } = useSession();
  const { setChats, setUsers } = useAppStore();

  const userId = session?.user?.id ?? "";
  const orgId = session?.user?.organizationId ?? "";

  // Connect socket
  useSocket({ userId, organizationId: orgId });

  // Fetch chats & users on mount
  useEffect(() => {
    if (!userId) return;

    fetch("/api/chats")
      .then((r) => r.json())
      .then(setChats)
      .catch(console.error);

    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error);
  }, [userId, setChats, setUsers]);

  return null;
}
