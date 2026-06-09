import { ExchangeConnection } from "@/db";
import { BadRequestError, NotFoundError } from "@/errors/app-error";
import { config } from "@/config";
import { OkxTradingClient } from "@/exchanges/okx/okx-trading.client";
import { decryptCredential, encryptCredential } from "@/utils/credential-crypto";

function assertDbReady() {
  if (!config.db.enabled) {
    throw new BadRequestError("数据库未启用");
  }
}

function credentialsKey(): string {
  const key = config.exchange.credentialsKey.trim() || config.jwtSecret.trim();
  if (!key) {
    throw new BadRequestError("交易所凭证加密未配置");
  }
  return key;
}

export class ExchangeConnectionService {
  static async connectOkx(
    userId: number,
    input: { apiKey: string; secretKey: string; passphrase: string; label?: string },
  ) {
    assertDbReady();

    const apiKey = input.apiKey.trim();
    const secretKey = input.secretKey.trim();
    const passphrase = input.passphrase.trim();
    if (!apiKey || !secretKey || !passphrase) {
      throw new BadRequestError("请填写完整的 OKX API 凭证");
    }

    const client = new OkxTradingClient(config.exchange.okxRestBaseUrl, {
      apiKey,
      secretKey,
      passphrase,
    });
    await client.getUsdtBalance();

    const encKey = credentialsKey();
    const payload = {
      userId,
      exchange: "okx",
      label: (input.label ?? "OKX").trim(),
      apiKeyEnc: encryptCredential(apiKey, encKey),
      secretEnc: encryptCredential(secretKey, encKey),
      passphraseEnc: encryptCredential(passphrase, encKey),
      permissions: "trade",
      status: 1,
    };

    const existing = await ExchangeConnection.findOne({
      where: { userId, exchange: "okx" },
    });

    if (existing) {
      await existing.update(payload);
      return { id: existing.id, exchange: "okx", label: existing.label };
    }

    const row = await ExchangeConnection.create(payload);
    return { id: row.id, exchange: "okx", label: row.label };
  }

  static async listForUser(userId: number) {
    assertDbReady();
    const rows = await ExchangeConnection.findAll({
      where: { userId, status: 1 },
      order: [["updateTime", "DESC"]],
    });

    return rows.map((row) => ({
      id: row.id,
      exchange: row.exchange,
      label: row.label,
      permissions: row.permissions,
      connected: true,
    }));
  }

  static async disconnect(userId: number, exchange: string) {
    assertDbReady();
    const row = await ExchangeConnection.findOne({
      where: { userId, exchange, status: 1 },
    });
    if (!row) {
      throw new NotFoundError("未找到交易所连接");
    }
    await row.update({ status: 0 });
  }

  static async getOkxClient(connectionId: number, userId: number): Promise<OkxTradingClient> {
    assertDbReady();
    const row = await ExchangeConnection.findOne({
      where: { id: connectionId, userId, exchange: "okx", status: 1 },
    });
    if (!row) {
      throw new NotFoundError("OKX 未连接");
    }

    const encKey = credentialsKey();
    return new OkxTradingClient(config.exchange.okxRestBaseUrl, {
      apiKey: decryptCredential(row.apiKeyEnc, encKey),
      secretKey: decryptCredential(row.secretEnc, encKey),
      passphrase: decryptCredential(row.passphraseEnc, encKey),
    });
  }
}
