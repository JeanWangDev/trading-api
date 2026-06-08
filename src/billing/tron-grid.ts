import { fetch } from "undici";
import { config } from "@/config";

export interface TronTrc20Transfer {
  txHash: string;
  from: string;
  to: string;
  amountUsdt: string;
  blockTimestamp: number;
}

interface TronGridTrc20Response {
  data?: Array<{
    transaction_id?: string;
    from?: string;
    to?: string;
    value?: string;
    block_timestamp?: number;
  }>;
}

function tronHeaders(): Record<string, string> {
  const headers: Record<string, string> = { accept: "application/json" };
  const apiKey = config.billing.tron.apiKey.trim();
  if (apiKey) {
    headers["TRON-PRO-API-KEY"] = apiKey;
  }
  return headers;
}

/** USDT TRC20 has 6 decimals */
export function usdtMicroToDecimal(value: string): string {
  const raw = BigInt(value);
  const whole = raw / 1_000_000n;
  const fraction = raw % 1_000_000n;
  return `${whole}.${fraction.toString().padStart(6, "0")}`;
}

export function decimalUsdtToMicro(amount: string): bigint {
  const [wholePart, fractionPart = ""] = amount.split(".");
  const fraction = (fractionPart + "000000").slice(0, 6);
  return BigInt(wholePart) * 1_000_000n + BigInt(fraction);
}

/**
 * Fetch recent TRC20 transfers TO `address` for the configured USDT contract.
 */
export async function fetchTrc20IncomingTransfers(
  address: string,
  minTimestampMs: number,
): Promise<TronTrc20Transfer[]> {
  const baseUrl = config.billing.tron.apiBaseUrl.replace(/\/$/, "");
  const contract = config.billing.tron.usdtContract;
  const url = new URL(`${baseUrl}/v1/accounts/${address}/transactions/trc20`);
  url.searchParams.set("only_to", "true");
  url.searchParams.set("contract_address", contract);
  url.searchParams.set("min_timestamp", String(minTimestampMs));
  url.searchParams.set("limit", "50");
  url.searchParams.set("order_by", "block_timestamp,asc");

  const response = await fetch(url, { headers: tronHeaders() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`TronGrid ${response.status}: ${text.slice(0, 200)}`);
  }

  const payload = (await response.json()) as TronGridTrc20Response;
  const rows = payload.data ?? [];

  return rows
    .filter((row) => row.transaction_id && row.to && row.value)
    .map((row) => ({
      txHash: row.transaction_id!,
      from: row.from ?? "",
      to: row.to!,
      amountUsdt: usdtMicroToDecimal(row.value!),
      blockTimestamp: row.block_timestamp ?? 0,
    }));
}
