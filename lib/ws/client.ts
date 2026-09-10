import type { ClientMessage, ConnectionStatus, ServerEventType, ServerEvents } from "./types";

type Listener<K extends ServerEventType> = (payload: ServerEvents[K]) => void;

const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 15000]; // caps at 15s

/**
 * One socket per app instance, not per component. Create it in
 * lib/store/backend-context.tsx and consume it via hooks — components
 * should never construct their own BackendSocket.
 *
 * Runs entirely in the browser (uses the native WebSocket API) — this
 * file must never be imported anywhere that isn't a client component.
 */
export class BackendSocket {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = "idle";
  private listeners = new Map<ServerEventType, Set<Listener<any>>>();
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private subscribedGuildIds = new Set<string>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;

  constructor(private wsUrl: string, private token: string) {}

  connect(): void {
    this.manuallyClosed = false;
    this.setStatus("connecting");

    const ws = new WebSocket(this.wsUrl);
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.setStatus("authenticating");
      this.send({ type: "auth", token: this.token });
      // Auth has no ack on success — treat "open" as good enough to resume
      // subscriptions; a bad token will get an "error" message + close(4001).
      this.setStatus("open");
      this.reconnectAttempt = 0;
      for (const guildId of this.subscribedGuildIds) {
        this.send({ type: "subscribe", guildId });
      }
    });

    ws.addEventListener("message", (event) => {
      let msg: { type: string; payload: unknown };
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      const listeners = this.listeners.get(msg.type as ServerEventType);
      if (listeners) {
        for (const listener of listeners) listener(msg.payload);
      }
    });

    ws.addEventListener("close", () => {
      this.setStatus("closed");
      if (!this.manuallyClosed) this.scheduleReconnect();
    });

    ws.addEventListener("error", () => {
      this.setStatus("error");
    });
  }

  disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect(): void {
    const delay = RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)];
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private send(message: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /** Only receive events for guilds you've explicitly subscribed to. */
  subscribe(guildId: string): void {
    this.subscribedGuildIds.add(guildId);
    this.send({ type: "subscribe", guildId });
  }

  unsubscribe(guildId: string): void {
    this.subscribedGuildIds.delete(guildId);
    this.send({ type: "unsubscribe", guildId });
  }

  on<K extends ServerEventType>(type: K, listener: Listener<K>): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
    return () => this.listeners.get(type)?.delete(listener);
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    for (const listener of this.statusListeners) listener(status);
  }
}

export function wsUrlFromHttpBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/^http/, "ws") + "/ws";
}
