import { z } from "zod";

export const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20MB per file
export const MAX_ATTACHMENTS_PER_MESSAGE = 5;

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

export const messageAttachmentSchema = z.object({
  key: z.string().min(1).max(1024),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(255),
  size: z.number().int().positive().max(MAX_ATTACHMENT_SIZE_BYTES),
});

export const sendMessageSchema = z.object({
  chatId: z.string(),
  content: z
    .string()
    .max(5000)
    .optional()
    .transform((value) => value?.trim() ?? ""),
  attachments: z.array(messageAttachmentSchema).max(MAX_ATTACHMENTS_PER_MESSAGE).optional().default([]),
}).superRefine((data, ctx) => {
  if (!data.content && data.attachments.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Message must include text or at least one attachment",
      path: ["content"],
    });
  }
});

export const createUploadUrlSchema = z.object({
  chatId: z.string(),
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(255),
  size: z.number().int().positive().max(MAX_ATTACHMENT_SIZE_BYTES),
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
export type MessageAttachmentInput = z.infer<typeof messageAttachmentSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateUploadUrlInput = z.infer<typeof createUploadUrlSchema>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
