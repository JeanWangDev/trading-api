import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

const STRONG_PASSWORD_RE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function assertStrongPassword(password: string): void {
  if (!STRONG_PASSWORD_RE.test(password)) {
    throw new Error(
      "密码至少8位，且需包含大写字母、小写字母、数字和特殊字符",
    );
  }
}

export function assertPasswordsMatch(password: string, confirmPassword: string): void {
  if (password !== confirmPassword) {
    throw new Error("两次输入的密码不一致");
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function defaultNicknameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim();
  return local || "user";
}
