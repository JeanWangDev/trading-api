import { CANONICAL_INTERVALS, type CanonicalInterval } from "@/types/market";

const CANONICAL_SET = new Set<string>(CANONICAL_INTERVALS);

export function isCanonicalInterval(value: string): value is CanonicalInterval {
  return CANONICAL_SET.has(value);
}

export function assertCanonicalInterval(value: string): CanonicalInterval {
  if (!isCanonicalInterval(value)) {
    throw new Error(
      `Unsupported interval "${value}". Allowed: ${CANONICAL_INTERVALS.join(", ")}`,
    );
  }

  return value;
}

/**
 * Build a bidirectional map between the canonical interval and the
 * exchange's native interval string.
 */
export function createIntervalMapper(
  table: Partial<Record<CanonicalInterval, string>>,
) {
  const toNative = new Map<CanonicalInterval, string>();
  const toCanonical = new Map<string, CanonicalInterval>();

  for (const [canonical, native] of Object.entries(table) as [
    CanonicalInterval,
    string,
  ][]) {
    toNative.set(canonical, native);
    toCanonical.set(native, canonical);
  }

  return {
    supported: Array.from(toNative.keys()),
    toNative(interval: CanonicalInterval): string {
      const native = toNative.get(interval);

      if (!native) {
        throw new Error(`Interval "${interval}" not supported by this exchange.`);
      }

      return native;
    },
    toCanonical(native: string): CanonicalInterval | undefined {
      return toCanonical.get(native);
    },
  };
}
