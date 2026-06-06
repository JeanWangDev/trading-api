import { z } from "zod";

const emailSchema = z
  .string({ message: "邮箱不能为空" })
  .trim()
  .min(1, "邮箱不能为空")
  .email("邮箱格式不正确")
  .transform((v) => v.toLowerCase());

const passwordSchema = z
  .string({ message: "密码不能为空" })
  .min(8, "密码至少8位")
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
    "密码需包含大写、小写、数字和特殊字符",
  );

const verificationCodeSchema = z
  .string({ message: "验证码不能为空" })
  .trim()
  .regex(/^\d{6}$/, "请输入 6 位数字验证码");

export const sendEmailCodeBodySchema = z.object({
  email: emailSchema,
  purpose: z.enum(["register", "reset_password"], {
    message: "无效的验证码用途",
  }),
});

/** Public registration — role is assigned server-side (default: normal_user). */
export const registerBodySchema = z
  .object({
    email: emailSchema,
    code: verificationCodeSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "请再次输入密码"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "密码不能为空"),
});

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z
  .object({
    email: emailSchema,
    code: verificationCodeSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "请再次输入密码"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export const updateProfileBodySchema = z.object({
  nickname: z
    .string({ message: "昵称不能为空" })
    .trim()
    .min(1, "昵称不能为空")
    .max(64, "昵称最多64个字符"),
});

export type SendEmailCodeBody = z.infer<typeof sendEmailCodeBodySchema>;
export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
