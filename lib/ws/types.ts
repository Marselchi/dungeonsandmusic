import type { PlaybackState } from "../api/types";

/** Server -> client event payloads, keyed by event type. */
export interface ServerEvents {
  "track.started": { guildId: string; trackId: string };
  "track.ended": { guildId: string; trackId: string; reason: "finished" | "skipped" | "error" };
  "queue.changed": { guildId: string };
  "player.stateChanged": { guildId: string; state: PlaybackState };
  "download.progress": { jobId: string; done: number; total: number };
  "voice.connected": { guildId: string; channelId: string };
  "voice.disconnected": { guildId: string };
  /** Not from the bus — sent directly by the ws layer on bad auth/JSON. */
  error: { message: string };
}

export type ServerEventType = keyof ServerEvents;

export interface ServerMessage<K extends ServerEventType = ServerEventType> {
  type: K;
  payload: ServerEvents[K];
}

/** Client -> server messages. Anything else is silently ignored by the backend. */
export type ClientMessage =
  | { type: "auth"; token: string }
  | { type: "subscribe"; guildId: string }
  | { type: "unsubscribe"; guildId: string };

export type ConnectionStatus = "idle" | "connecting" | "authenticating" | "open" | "closed" | "error";
