"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
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
import { Building2, Plus, LogOut, Users, FolderTree, Pencil, Trash2 } from "lucide-react";

interface Department {
  _id: string;
  name: string;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  departmentId?: { _id: string; name: string } | string;
}

export function OrgAdminPanel() {
  const { data: session } = useSession();
  const [tab, setTab] = useState<"departments" | "employees">("employees");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Department form
  const [showCreateDept, setShowCreateDept] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptLoading, setDeptLoading] = useState(false);

  // Employee create form
  const [showCreateEmp, setShowCreateEmp] = useState(false);
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [empDept, setEmpDept] = useState("");
  const [empRole, setEmpRole] = useState<"admin" | "employee">("employee");
  const [empLoading, setEmpLoading] = useState(false);

  // Employee edit form
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editRole, setEditRole] = useState<"admin" | "employee">("employee");
  const [editLoading, setEditLoading] = useState(false);

  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [dRes, eRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/users"),
      ]);
      setDepartments(await dRes.json());
      setEmployees(await eRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateDept = async () => {
    if (!deptName.trim()) return;
    setDeptLoading(true);
    setError("");
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deptName }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Failed");
        return;
      }
      const dept = await res.json();
      setDepartments((prev) => [...prev, dept]);
      setDeptName("");
      setShowCreateDept(false);
    } catch {
      setError("Something went wrong");
    } finally {
      setDeptLoading(false);
    }
  };

  const handleCreateEmployee = async () => {
    if (!empName.trim() || !empEmail.trim() || !empPassword.trim()) return;
    setEmpLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: empName,
          email: empEmail,
          password: empPassword,
          departmentId: empDept || undefined,
          role: empRole,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Failed");
        return;
      }
      const emp = await res.json();
      setEmployees((prev) => [...prev, emp]);
      setEmpName("");
      setEmpEmail("");
      setEmpPassword("");
      setEmpDept("");
      setEmpRole("employee");
      setShowCreateEmp(false);
    } catch {
      setError("Something went wrong");
    } finally {
      setEmpLoading(false);
    }
  };

  const handleUpdateEmployee = async () => {
    if (!editEmp) return;
    setEditLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = {};
      if (editName.trim()) body.name = editName;
      if (editEmail.trim()) body.email = editEmail;
      if (editPassword.trim()) body.password = editPassword;
      body.departmentId = editDept || null;
      body.role = editRole;

      const res = await fetch(`/api/users/${editEmp._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Failed");
        return;
      }
      const updated = await res.json();
      setEmployees((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
      setEditEmp(null);
    } catch {
      setError("Something went wrong");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEmployees((prev) => prev.filter((e) => e._id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditEmployee = (emp: Employee) => {
    setEditEmp(emp);
    setEditName(emp.name);
    setEditEmail(emp.email);
    setEditPassword("");
    setEditDept(
      typeof emp.departmentId === "object" && emp.departmentId
        ? emp.departmentId._id
        : ""
    );
    setEditRole(emp.role as "admin" | "employee");
    setError("");
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Organization Admin</h1>
              <p className="text-sm text-muted-foreground">
                {session?.user?.name} — {session?.user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin</Badge>
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Tabs */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant={tab === "employees" ? "default" : "outline"}
              onClick={() => setTab("employees")}
            >
              <Users className="mr-2 h-4 w-4" />
              Employees ({employees.length})
            </Button>
            <Button
              variant={tab === "departments" ? "default" : "outline"}
              onClick={() => setTab("departments")}
            >
              <FolderTree className="mr-2 h-4 w-4" />
              Departments ({departments.length})
            </Button>
          </div>
          <Button
            onClick={() => {
              setError("");
              tab === "employees" ? setShowCreateEmp(true) : setShowCreateDept(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {tab === "employees" ? "Add User" : "Add Department"}
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : tab === "employees" ? (
            employees.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No employees yet</p>
            ) : (
              <div className="space-y-2">
                {employees.map((emp) => (
                  <div
                    key={emp._id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {emp.departmentId &&
                        typeof emp.departmentId === "object" && (
                          <Badge variant="outline" className="text-[10px]">
                            {emp.departmentId.name}
                          </Badge>
                        )}
                      <Badge variant="secondary" className="text-[10px]">
                        {emp.role}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => openEditEmployee(emp)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {emp._id !== session?.user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteEmployee(emp._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : departments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No departments yet</p>
          ) : (
            <div className="space-y-2">
              {departments.map((dept) => (
                <div
                  key={dept._id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <p className="font-medium">{dept.name}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Create Employee Dialog */}
        <Dialog open={showCreateEmp} onOpenChange={setShowCreateEmp}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Employee</DialogTitle>
              <DialogDescription>Add a new user to your organization</DialogDescription>
            </DialogHeader>
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="John Doe" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} placeholder="john@company.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Password</Label>
                  <Input type="password" value={empPassword} onChange={(e) => setEmpPassword(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Department</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                  >
                    <option value="">None</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value as "admin" | "employee")}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button
                onClick={handleCreateEmployee}
                disabled={empLoading || !empName || !empEmail || !empPassword}
                className="w-full"
              >
                {empLoading ? "Creating..." : "Create Employee"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Employee Dialog */}
        <Dialog open={!!editEmp} onOpenChange={(open) => !open && setEditEmp(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>Update employee details</DialogDescription>
            </DialogHeader>
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">New Password (optional)</Label>
                  <Input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Department</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                  >
                    <option value="">None</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as "admin" | "employee")}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button onClick={handleUpdateEmployee} disabled={editLoading} className="w-full">
                {editLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create Department Dialog */}
        <Dialog open={showCreateDept} onOpenChange={setShowCreateDept}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Department</DialogTitle>
              <DialogDescription>Add a new department to your organization</DialogDescription>
            </DialogHeader>
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-center text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Department Name</Label>
                <Input
                  placeholder="Engineering"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateDept()}
                />
              </div>
              <Button onClick={handleCreateDept} disabled={deptLoading || !deptName.trim()} className="w-full">
                {deptLoading ? "Creating..." : "Create Department"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
