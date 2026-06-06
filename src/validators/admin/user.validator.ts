import { z } from "zod";
import { ROLE_KEYS } from "@/constants/roles";

const roleKeySchema = z.enum(ROLE_KEYS);

export const listAdminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  query: z.string().trim().max(128).optional().default(""),
});

export const updateAdminUserRoleBodySchema = z.object({
  id: z.number().int().positive(),
  roleKey: roleKeySchema,
});

export const updateAdminUserStatusBodySchema = z.object({
  id: z.number().int().positive(),
  status: z.union([z.literal(0), z.literal(1)]),
});

export const createAdminUserBodySchema = z.object({
  email: z.string().trim().email("邮箱格式不正确").transform((v) => v.toLowerCase()),
  password: z.string().min(8, "密码至少8位"),
  nickname: z.string().trim().max(64).optional(),
  roleKey: roleKeySchema.optional().default("normal_user"),
});
