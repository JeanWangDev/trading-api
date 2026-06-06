import type { RawData } from "ws";

/** Safely decode a ws RawData frame to UTF-8 text for JSON.parse. */
export function rawDataToString(raw: RawData): string {
  if (typeof raw === "string") {
    return raw;
  }

  if (Buffer.isBuffer(raw)) {
    return raw.toString("utf8");
  }

  if (Array.isArray(raw)) {
    return Buffer.concat(raw).toString("utf8");
  }

  return Buffer.from(raw).toString("utf8");
}
