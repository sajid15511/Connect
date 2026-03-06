"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Building2, Users, FolderTree } from "lucide-react";

interface Department {
  _id: string;
  name: string;
}

interface Employee {
  _id: string;
  name: string;
  email: string;
  role: string;
  departmentId?: { _id: string; name: string };
}

interface AdminPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminPanel({ open, onOpenChange }: AdminPanelProps) {
  const { data: session } = useSession();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tab, setTab] = useState<"departments" | "employees">("departments");

  // Department form
  const [deptName, setDeptName] = useState("");
  const [deptLoading, setDeptLoading] = useState(false);

  // Employee form
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [empDept, setEmpDept] = useState("");
  const [empLoading, setEmpLoading] = useState(false);

  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    if (!open) return;
    fetch("/api/departments").then((r) => r.json()).then(setDepartments).catch(console.error);
    fetch("/api/users").then((r) => r.json()).then(setEmployees).catch(console.error);
  }, [open]);

  const handleCreateDept = async () => {
    if (!deptName.trim()) return;
    setDeptLoading(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deptName }),
      });
      const dept = await res.json();
      setDepartments((prev) => [...prev, dept]);
      setDeptName("");
    } catch (err) {
      console.error(err);
    } finally {
      setDeptLoading(false);
    }
  };

  const handleCreateEmployee = async () => {
    if (!empName.trim() || !empEmail.trim() || !empPassword.trim()) return;
    setEmpLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: empName,
          email: empEmail,
          password: empPassword,
          departmentId: empDept || undefined,
          role: "employee",
        }),
      });
      const emp = await res.json();
      setEmployees((prev) => [...prev, emp]);
      setEmpName("");
      setEmpEmail("");
      setEmpPassword("");
      setEmpDept("");
    } catch (err) {
      console.error(err);
    } finally {
      setEmpLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Admin Panel
          </DialogTitle>
          <DialogDescription>Manage departments and employees</DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={tab === "departments" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("departments")}
          >
            <FolderTree className="mr-1 h-3.5 w-3.5" />
            Departments
          </Button>
          <Button
            variant={tab === "employees" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("employees")}
          >
            <Users className="mr-1 h-3.5 w-3.5" />
            Employees
          </Button>
        </div>

        <Separator />

        {tab === "departments" ? (
          <div className="space-y-4">
            {/* Create */}
            <div className="flex gap-2">
              <Input
                placeholder="Department name"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleCreateDept} disabled={deptLoading || !deptName.trim()}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>

            {/* List */}
            <div className="space-y-2">
              {departments.map((d) => (
                <div key={d._id} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm font-medium">{d.name}</span>
                </div>
              ))}
              {departments.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">No departments yet</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Create */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input value={empName} onChange={(e) => setEmpName(e.target.value)} placeholder="John Doe" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} placeholder="john@company.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Password</Label>
                  <Input type="password" value={empPassword} onChange={(e) => setEmpPassword(e.target.value)} />
                </div>
                <div>
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
              <Button
                onClick={handleCreateEmployee}
                disabled={empLoading || !empName || !empEmail || !empPassword}
                className="w-full"
              >
                <Plus className="mr-1 h-4 w-4" />
                Create Employee
              </Button>
            </div>

            <Separator />

            {/* List */}
            <div className="space-y-2">
              {employees.map((e) => (
                <div key={e._id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.departmentId && typeof e.departmentId === "object" && (
                      <Badge variant="outline" className="text-[10px]">
                        {e.departmentId.name}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px]">
                      {e.role}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
