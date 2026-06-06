import type { IKline, ISymbolInfo, ISymbolSummary, ITicker24h } from "@/types/market";

export interface KlineBarDto {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function toKlineBarDto(bar: IKline): KlineBarDto {
  return {
    time: bar.time,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  };
}

export function toKlineBarDtoList(bars: IKline[]): KlineBarDto[] {
  return bars.map(toKlineBarDto);
}

export interface SymbolSummaryDto {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  description: string;
}

export interface TradingPairDto {
  id: number;
  baseAsset: string;
  symbol: string;
  exchange: string;
  displayName: string;
  sortOrder: number;
  isDefault: boolean;
  accessTier: 0 | 1;
  status: number;
  locked?: boolean;
}

export function toTradingPairDto(item: {
  id: number;
  baseAsset: string;
  symbol: string;
  exchange: string;
  displayName: string;
  sortOrder: number;
  isDefault: boolean;
  accessTier: 0 | 1;
  status: number;
  locked?: boolean;
}): TradingPairDto {
  return {
    id: item.id,
    baseAsset: item.baseAsset,
    symbol: item.symbol,
    exchange: item.exchange,
    displayName: item.displayName,
    sortOrder: item.sortOrder,
    isDefault: item.isDefault,
    accessTier: item.accessTier,
    status: item.status,
    ...(item.locked !== undefined ? { locked: item.locked } : {}),
  };
}

export function toSymbolSummaryDto(item: ISymbolSummary): SymbolSummaryDto {
  return {
    symbol: item.symbol,
    baseAsset: item.baseAsset,
    quoteAsset: item.quoteAsset,
    description: item.description,
  };
}

export interface SymbolInfoDto extends SymbolSummaryDto {
  pricePrecision: number;
  quantityPrecision: number;
  supportedIntervals: string[];
}

export function toSymbolInfoDto(info: ISymbolInfo): SymbolInfoDto {
  return {
    symbol: info.symbol,
    baseAsset: info.baseAsset,
    quoteAsset: info.quoteAsset,
    description: info.description,
    pricePrecision: info.pricePrecision,
    quantityPrecision: info.quantityPrecision,
    supportedIntervals: info.supportedIntervals,
  };
}

export interface Ticker24hDto {
  symbol: string;
  lastPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
}

export function toTicker24hDto(ticker: ITicker24h): Ticker24hDto {
  return {
    symbol: ticker.symbol,
    lastPrice: ticker.lastPrice,
    openPrice: ticker.openPrice,
    highPrice: ticker.highPrice,
    lowPrice: ticker.lowPrice,
    priceChange: ticker.priceChange,
    priceChangePercent: ticker.priceChangePercent,
    volume: ticker.volume,
    quoteVolume: ticker.quoteVolume,
  };
}
