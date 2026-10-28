import { z } from "zod";
import { PRIORITIES, ROLES, STATUSES } from "./constants";

export const emailSchema = z
  .string()
  .trim()
  .min(3, "Enter your email")
  .max(254, "That email is too long")
  .email("Enter a valid email address")
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(60, "Name must be at most 60 characters");

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(72),
});

export const projectNameSchema = z
  .string()
  .trim()
  .min(2, "Project name must be at least 2 characters")
  .max(80, "Project name must be at most 80 characters");

export const projectDescriptionSchema = z
  .string()
  .trim()
  .max(500, "Description must be at most 500 characters");

export const colorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid color");

export const createProjectSchema = z.object({
  name: projectNameSchema,
  description: projectDescriptionSchema.optional().default(""),
  color: colorSchema.optional(),
});

export const updateProjectSchema = z.object({
  name: projectNameSchema.optional(),
  description: projectDescriptionSchema.optional(),
  color: colorSchema.optional(),
});

export const taskTitleSchema = z
  .string()
  .trim()
  .min(1, "Give the task a title")
  .max(140, "Title must be at most 140 characters");

export const taskDescriptionSchema = z
  .string()
  .max(4000, "Description must be at most 4000 characters");

export const dueDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .nullable()
  .optional();

export const createTaskSchema = z.object({
  title: taskTitleSchema,
  description: taskDescriptionSchema.optional().default(""),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  dueDate: dueDateSchema,
});

export const updateTaskSchema = z
  .object({
    title: taskTitleSchema.optional(),
    description: taskDescriptionSchema.optional(),
    status: z.enum(STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    assigneeId: z.string().min(1).nullable().optional(),
    dueDate: dueDateSchema,
    position: z.number().finite().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nothing to update",
  });

export const moveTaskSchema = z.object({
  status: z.enum(STATUSES),
  beforeId: z.string().nullable().optional(),
  afterId: z.string().nullable().optional(),
});

export const commentBodySchema = z
  .string()
  .trim()
  .min(1, "Write a comment first")
  .max(5000, "Comment must be at most 5000 characters");

export const createCommentSchema = z.object({ body: commentBodySchema });

export const updateCommentSchema = z.object({ body: commentBodySchema });

export const addMemberSchema = z.object({ email: emailSchema });

export const updateMemberRoleSchema = z.object({
  role: z.enum(ROLES).refine((role) => role !== "OWNER", {
    message: "Ownership can't be assigned here",
  }),
});

export const updateProfileSchema = z.object({
  name: nameSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
