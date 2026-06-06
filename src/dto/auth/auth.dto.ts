import type { AuthUserProfile } from "@/types/auth";

export function toAuthUserDto(user: AuthUserProfile) {
  return {
    id: String(user.id),
    email: user.email,
    nickname: user.nickname,
    roleKey: user.roleKey,
    roleName: user.roleName,
    roleLevel: user.roleLevel,
  };
}

export function toAuthSessionDto(input: {
  accessToken: string;
  expiresAt: number;
  user: AuthUserProfile;
}) {
  return {
    accessToken: input.accessToken,
    expiresAt: input.expiresAt,
    user: toAuthUserDto(input.user),
  };
}
