import { EventEmitter } from "events";
import type { EventRecord } from "@/types/event";

export type EventWsPayload = Pick<
  EventRecord,
  "id" | "source" | "type" | "title" | "symbols" | "sentiment" | "impact" | "publishedAt"
>;

const bus = new EventEmitter();
bus.setMaxListeners(50);

export function emitEventCreated(event: EventWsPayload): void {
  bus.emit("created", event);
}

export function onEventCreated(listener: (event: EventWsPayload) => void): () => void {
  bus.on("created", listener);
  return () => bus.off("created", listener);
}
