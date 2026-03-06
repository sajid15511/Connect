"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Building2, Plus, LogOut, Pencil, Trash2 } from "lucide-react";

interface Organization {
  _id: string;
  name: string;
  createdAt: string;
  deletedAt?: string;
}

export function TenantAdminPanel() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit form
  const [editOrg, setEditOrg] = useState<Organization | null>(null);
  const [editName, setEditName] = useState("");
  const [editing, setEditing] = useState(false);

  const [error, setError] = useState("");

  const fetchOrgs = useCallback(async () => {
    try {
      const res = await fetch("/api/organizations");
      const data = await res.json();
      setOrgs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Failed to create");
        return;
      }
      const org = await res.json();
      setOrgs((prev) => [...prev, org]);
      setCreateName("");
      setShowCreate(false);
    } catch {
      setError("Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editOrg || !editName.trim()) return;
    setEditing(true);
    setError("");
    try {
      const res = await fetch(`/api/organizations/${editOrg._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Failed to update");
        return;
      }
      const updated = await res.json();
      setOrgs((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
      setEditOrg(null);
    } catch {
      setError("Something went wrong");
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this organization?")) return;
    try {
      const res = await fetch(`/api/organizations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setOrgs((prev) => prev.filter((o) => o._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-col p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Tenant Administration</h1>
              <p className="text-sm text-muted-foreground">Manage organizations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Tenant Admin</Badge>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Actions */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Organizations ({orgs.length})</h2>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Button>
        </div>

        {/* Org List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : orgs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No organizations yet</p>
          ) : (
            <div className="space-y-2">
              {orgs.map((org) => (
                <div
                  key={org._id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(org.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditOrg(org);
                        setEditName(org.name);
                        setError("");
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(org._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
              <DialogDescription>Add a new organization to the platform</DialogDescription>
            </DialogHeader>
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input
                  placeholder="Acme Inc."
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              <Button onClick={handleCreate} disabled={creating || !createName.trim()} className="w-full">
                {creating ? "Creating..." : "Create Organization"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editOrg} onOpenChange={(open) => !open && setEditOrg(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Organization</DialogTitle>
              <DialogDescription>Update organization details</DialogDescription>
            </DialogHeader>
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Organization Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
                />
              </div>
              <Button onClick={handleUpdate} disabled={editing || !editName.trim()} className="w-full">
                {editing ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
