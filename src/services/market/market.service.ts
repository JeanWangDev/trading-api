import type { IKline } from "@/types/market";
import { getExchange, listExchanges } from "@/exchanges/registry";
import {
  computePriceLevelsFromBars,
  type PriceLevelsResult,
} from "@/services/market/price-levels.service";
import type {
  KlinesQuery,
  PriceLevelsQuery,
  SearchSymbolsQuery,
  SymbolInfoQuery,
  TickerQuery,
} from "@/validators/market";
import { UpstreamServiceError } from "@/errors/app-error";

export interface KlinesResult {
  bars: IKline[];
  cacheControl: string;
}

class MarketService {
  listExchanges() {
    return listExchanges().map((adapter) => adapter.meta);
  }

  async getServerTime(exchangeId?: string) {
    const exchange = getExchange(exchangeId);
    const serverTime = await exchange.rest.getServerTime();

    return {
      exchange: exchange.meta.id,
      serverTime,
    };
  }

  async getKlines(query: KlinesQuery): Promise<KlinesResult> {
    const exchange = getExchange(query.exchange);

    try {
      const bars = await exchange.rest.getKlines({
        symbol: query.symbol,
        interval: query.interval,
        startTime: query.startTime,
        endTime: query.endTime,
        limit: query.limit,
      });

      return {
        bars,
        cacheControl: this.resolveKlineCacheControl(query.startTime, query.endTime),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upstream klines failed";
      throw new UpstreamServiceError(message);
    }
  }

  async searchSymbols(query: SearchSymbolsQuery) {
    const exchange = getExchange(query.exchange);

    try {
      return await exchange.rest.searchSymbols({
        query: query.query,
        limit: query.limit,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upstream symbols failed";
      throw new UpstreamServiceError(message);
    }
  }

  async getSymbolInfo(query: SymbolInfoQuery) {
    const exchange = getExchange(query.exchange);

    try {
      return await exchange.rest.getSymbolInfo(query.symbol);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upstream symbol-info failed";
      throw new UpstreamServiceError(message);
    }
  }

  async getTicker24h(query: TickerQuery) {
    const exchange = getExchange(query.exchange);

    try {
      return await exchange.rest.getTicker24h(query.symbol);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upstream ticker failed";
      throw new UpstreamServiceError(message);
    }
  }

  async getPriceLevels(query: PriceLevelsQuery): Promise<PriceLevelsResult> {
    const limit = query.limit ?? 3;
    const bars = await this.getKlines({
      exchange: query.exchange,
      symbol: query.symbol,
      interval: query.interval,
      limit: 500,
    });

    const { price, supports, resistances } = computePriceLevelsFromBars(
      bars.bars,
      limit,
    );

    return {
      symbol: query.symbol,
      interval: query.interval,
      price,
      supports,
      resistances,
    };
  }

  private resolveKlineCacheControl(startTime?: number, endTime?: number): string {
    const now = Date.now();
    const isFullyHistorical = endTime !== undefined && endTime < now - 60_000;

    return isFullyHistorical
      ? "public, max-age=86400, immutable"
      : "public, max-age=2, s-maxage=2";
  }
}

export default new MarketService();
