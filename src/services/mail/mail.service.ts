import { Resend } from "resend";
import { config } from "@/config";
import { BadRequestError } from "@/errors/app-error";

export function buildVerificationEmailText(code: string): string {
  return `Polaris邮箱验证码： ${code}，有效时间1分钟！`;
}

export class MailService {
  private static client: Resend | null = null;

  private static getClient(): Resend {
    if (!config.mail.resendApiKey) {
      throw new BadRequestError("邮件服务未配置 RESEND_API_KEY");
    }
    if (!MailService.client) {
      MailService.client = new Resend(config.mail.resendApiKey);
    }
    return MailService.client;
  }

  static async sendVerificationCode(to: string, code: string): Promise<void> {
    const text = buildVerificationEmailText(code);
    const subject = "Polaris 邮箱验证码";

    if (!config.mail.enabled) {
      console.info(`[mail:dev] to=${to} ${text}`);
      return;
    }

    const client = MailService.getClient();
    const { error } = await client.emails.send({
      from: config.mail.from,
      to: [to],
      subject,
      text,
    });

    if (error) {
      console.error("[mail] resend error", error);
      throw new BadRequestError(error.message || "邮件发送失败，请稍后重试");
    }
  }
}
