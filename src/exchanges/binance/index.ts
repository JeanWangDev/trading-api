import type { IExchangeAdapter } from "@/exchanges/types";
import { binanceRest } from "./rest";
import { binanceWs } from "./ws";

export const binanceAdapter: IExchangeAdapter = {
  meta: {
    id: "binance",
    name: "Binance",
    description: "Binance Spot",
  },
  rest: binanceRest,
  ws: binanceWs,
};
