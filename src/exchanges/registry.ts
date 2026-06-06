import type { IExchangeAdapter } from "@/exchanges/types";
import { binanceAdapter } from "@/exchanges/binance";

/**
 * Central registry of exchange adapters.
 *
 * To plug in a new exchange (OKX, Bybit, Coinbase, ...):
 *   1. Create `exchanges/<id>/{rest,ws,index}.ts` implementing IExchangeAdapter
 *   2. Add the adapter here
 *   3. Nothing else in the codebase needs to change — routes and the WS hub
 *      look up adapters by `id` through this registry
 */
const adapters: ReadonlyArray<IExchangeAdapter> = [binanceAdapter];

const adapterMap = new Map(adapters.map((adapter) => [adapter.meta.id, adapter]));

export const DEFAULT_EXCHANGE_ID = binanceAdapter.meta.id;

export function listExchanges(): IExchangeAdapter[] {
  return [...adapters];
}

export function getExchange(id?: string | null): IExchangeAdapter {
  const resolved = (id ?? DEFAULT_EXCHANGE_ID).toLowerCase();
  const adapter = adapterMap.get(resolved);

  if (!adapter) {
    throw new ExchangeNotFoundError(resolved);
  }

  return adapter;
}

export class ExchangeNotFoundError extends Error {
  status = 400;

  constructor(id: string) {
    super(`Exchange "${id}" is not supported.`);
    this.name = "ExchangeNotFoundError";
  }
}
