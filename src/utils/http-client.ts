import { Agent, fetch as undiciFetch, setGlobalDispatcher } from "undici";

/**
 * Tuned HTTP dispatcher for upstream exchange traffic.
 *
 * Why this matters: Node's default global dispatcher opens a fresh TCP+TLS
 * connection roughly per request, so every market-data call pays a 100-300ms
 * handshake tax. We share a single, keep-alive + HTTP/2-enabled pool across
 * the process so warm requests amortise the handshake.
 *
 * - `keepAliveTimeout`/`keepAliveMaxTimeout` are deliberately well above
 *   Binance's keep-alive window so we recycle sockets aggressively.
 * - `connections` caps the per-origin socket count; 32 is more than enough
 *   for our concurrency profile while still bounded.
 * - `allowH2` opts into HTTP/2 multiplexing — Binance + Cloudflare both
 *   negotiate it, which lets parallel kline/range fetches share one socket.
 * - `pipelining` is 1 because Binance's HTTP/1.1 stack reacts poorly to
 *   pipelining; HTTP/2 streams take over the multiplexing job.
 */
export const upstreamAgent = new Agent({
  keepAliveTimeout: 30_000,
  keepAliveMaxTimeout: 60_000,
  connections: 32,
  allowH2: true,
  pipelining: 1,
  bodyTimeout: 15_000,
  headersTimeout: 15_000,
});

// Make all `fetch()` calls in the app go through the tuned dispatcher.
setGlobalDispatcher(upstreamAgent);

export class UpstreamError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

/**
 * Thin wrapper around undici's fetch that throws on non-2xx with a useful
 * error and decodes JSON eagerly. Centralises the upstream call shape so
 * adapters stay tiny.
 */
export async function fetchJson<T>(url: string): Promise<T> {
  const response = await undiciFetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, br",
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new UpstreamError(
      response.status,
      `Upstream ${response.status} for ${url}: ${text.slice(0, 200)}`,
    );
  }

  return (await response.json()) as T;
}

export interface RetryOptions {
  /** Max attempts including the first. Default: 3. */
  attempts?: number;
  /** Base delay in ms for the exponential backoff. Default: 200. */
  baseDelayMs?: number;
  /** Cap on the delay between attempts. Default: 2000. */
  maxDelayMs?: number;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function isRetryable(error: unknown): boolean {
  if (error instanceof UpstreamError) {
    return RETRYABLE_STATUS.has(error.status);
  }

  // Network-layer failures (ECONNRESET, timeouts, etc.) come back as
  // generic Errors / TypeErrors from undici. Treat all non-UpstreamError
  // failures as transient and worth retrying.
  return error instanceof Error;
}

function backoff(attempt: number, options: Required<RetryOptions>) {
  const exponent = Math.min(attempt, 5);
  const base = options.baseDelayMs * 2 ** exponent;
  const capped = Math.min(base, options.maxDelayMs);
  // Decorrelated jitter so a herd doesn't all retry at the same instant.
  return Math.floor(capped * (0.5 + Math.random() / 2));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Same contract as `fetchJson` but retries transient failures with
 * exponential backoff + jitter. Use this for idempotent GETs only.
 *
 * Retries on:
 *   - Network errors (ECONNRESET, timeouts, etc.)
 *   - HTTP 408, 425, 429, 5xx (server overload / transient upstream)
 *
 * Does NOT retry on:
 *   - 4xx (those signal bad params / not-found / forbidden)
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  options?: RetryOptions,
): Promise<T> {
  const config: Required<RetryOptions> = {
    attempts: options?.attempts ?? 3,
    baseDelayMs: options?.baseDelayMs ?? 200,
    maxDelayMs: options?.maxDelayMs ?? 2000,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt < config.attempts; attempt += 1) {
    try {
      return await fetchJson<T>(url);
    } catch (error) {
      lastError = error;

      if (!isRetryable(error) || attempt === config.attempts - 1) {
        throw error;
      }

      await sleep(backoff(attempt, config));
    }
  }

  // Unreachable — the loop either returns on success or throws on the last
  // failed attempt. Re-throw lastError defensively to satisfy TS.
  throw lastError;
}

/** Fire-and-forget a HEAD/GET to warm the TLS + HTTP/2 stream pool. */
export async function warmUpstream(url: string): Promise<void> {
  try {
    await undiciFetch(url, { method: "GET" });
  } catch (error) {
    console.warn(`[http-client] warmup failed for ${url}`, error);
  }
}
