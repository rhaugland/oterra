import { z } from "zod";

// Admin auth
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Admin registration
export const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Password reset
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Data rooms
export const createRoomSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;

// Contacts
export const createContactSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  company: z.string().optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;

// Access assignment
export const assignAccessSchema = z.object({
  contactId: z.string().uuid(),
  dataRoomId: z.string().uuid(),
});

export type AssignAccessInput = z.infer<typeof assignAccessSchema>;

// Approval actions
export const approvalActionSchema = z.object({
  action: z.enum(["approved", "denied", "revoked"]),
});

export type ApprovalActionInput = z.infer<typeof approvalActionSchema>;

// Tags
export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().optional(),
  dataRoomId: z.string().uuid(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

// Contact portal: magic link request
export const requestMagicLinkSchema = z.object({
  email: z.string().email(),
});

export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;
