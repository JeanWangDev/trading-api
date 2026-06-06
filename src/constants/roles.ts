export const ROLE_KEYS = [
  "normal_user",
  "vip_user",
  "staff_operator",
  "admin",
  "super_admin",
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

/** Default role for new sign-ups; upgrades via packages / admin later. */
export const DEFAULT_REGISTER_ROLE_KEY: RoleKey = "normal_user";
