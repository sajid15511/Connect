import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  organizationName: z.string().min(2).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createEmployeeSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  departmentId: z.string().optional(),
  role: z.enum(["admin", "employee"]).default("employee"),
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).max(100).optional(),
  departmentId: z.string().optional().nullable(),
  role: z.enum(["admin", "employee"]).optional(),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(2).max(100),
});

export const createChatSchema = z.object({
  participantIds: z.array(z.string()).min(1),
  type: z.enum(["direct", "group"]).default("direct"),
  name: z.string().optional(),
});

export const sendMessageSchema = z.object({
  chatId: z.string(),
  content: z.string().min(1).max(5000),
});

// Tenant admin schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type CreateChatInput = z.infer<typeof createChatSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
