import { createHmac } from "crypto";
import { fetch as undiciFetch } from "undici";
import { UpstreamError } from "@/utils/http-client";

export type OkxCredentials = {
  apiKey: string;
  secretKey: string;
  passphrase: string;
};

type OkxResponse<T> = {
  code: string;
  msg: string;
  data?: T;
};

function signRequest(
  creds: OkxCredentials,
  timestamp: string,
  method: string,
  path: string,
  body: string,
): string {
  const prehash = `${timestamp}${method}${path}${body}`;
  return createHmac("sha256", creds.secretKey).update(prehash).digest("base64");
}

async function okxPrivateRequest<T>(
  baseUrl: string,
  creds: OkxCredentials,
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const timestamp = new Date().toISOString();
  const bodyStr = body ? JSON.stringify(body) : "";
  const sign = signRequest(creds, timestamp, method, path, bodyStr);

  const headers: Record<string, string> = {
    "OK-ACCESS-KEY": creds.apiKey,
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": creds.passphrase,
    "Content-Type": "application/json",
  };

  const url = `${baseUrl}${path}`;
  const response = await undiciFetch(url, {
    method,
    headers,
    body: bodyStr || undefined,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new UpstreamError(
      response.status,
      `OKX ${response.status}: ${text.slice(0, 200)}`,
    );
  }

  const res = (await response.json()) as OkxResponse<T>;
  if (res.code !== "0") {
    throw new Error(res.msg || `OKX error ${res.code}`);
  }

  return res.data as T;
}

/** Convert BTCUSDT → BTC-USDT-SWAP (USDT margined perpetual) */
export function toOkxSwapInstId(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  if (upper.endsWith("USDT")) {
    return `${upper.slice(0, -4)}-USDT-SWAP`;
  }
  return `${upper}-USDT-SWAP`;
}

export class OkxTradingClient {
  constructor(
    private readonly baseUrl: string,
    private readonly creds: OkxCredentials,
  ) {}

  async getUsdtBalance(): Promise<number> {
    const data = await okxPrivateRequest<
      Array<{ details?: Array<{ ccy: string; availBal: string }> }>
    >(this.baseUrl, this.creds, "GET", "/api/v5/account/balance?ccy=USDT");

    const details = data?.[0]?.details ?? [];
    const usdt = details.find((row) => row.ccy === "USDT");
    return Number(usdt?.availBal ?? 0);
  }

  async placeMarketOrder(input: {
    instId: string;
    side: "buy" | "sell";
    sz: string;
    tdMode?: "cross" | "isolated";
  }): Promise<string> {
    const data = await okxPrivateRequest<Array<{ ordId: string }>>(
      this.baseUrl,
      this.creds,
      "POST",
      "/api/v5/trade/order",
      {
        instId: input.instId,
        tdMode: input.tdMode ?? "cross",
        side: input.side,
        ordType: "market",
        sz: input.sz,
      },
    );

    const ordId = data?.[0]?.ordId;
    if (!ordId) {
      throw new Error("OKX order id missing");
    }
    return ordId;
  }
}
