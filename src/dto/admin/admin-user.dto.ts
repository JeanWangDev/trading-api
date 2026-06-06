import type { AdminUserRecord } from "@/services/admin/admin-user.service";

export type AdminUserDto = {
  id: number;
  email: string;
  nickname: string;
  status: number;
  roleKey: string;
  roleName: string;
  roleLevel: number;
  lastLoginTime: number | null;
  createdAt: number;
  updatedAt: number;
};

export function toAdminUserDto(record: AdminUserRecord): AdminUserDto {
  return {
    id: record.id,
    email: record.email,
    nickname: record.nickname,
    status: record.status,
    roleKey: record.roleKey,
    roleName: record.roleName,
    roleLevel: record.roleLevel,
    lastLoginTime: record.lastLoginTime,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
