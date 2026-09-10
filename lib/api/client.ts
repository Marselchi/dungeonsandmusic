import { ApiError, BackendUnreachableError } from "./errors";
import type {
  AddToQueueRequest,
  ApiErrorBody,
  Guild,
  HealthResponse,
  Playlist,
  PlaylistTrack,
  PlayerState,
  QueueItem,
  SettingsMap,
  Track,
  VoiceChannel,
} from "./types";

export interface ApiClientOptions {
  baseUrl: string;
  token: string | null;
}

/**
 * Thin wrapper around fetch(). Every method here runs entirely in the
 * browser — this file must never be imported into a Server Component,
 * Route Handler, or Server Action. There is no server-side proxy: the
 * browser talks directly to the backend at `baseUrl` (typically the
 * user's own machine). See doc.md's "Deployment model" section.
 */
export class ApiClient {
  constructor(private options: ApiClientOptions) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    if (this.options.token) headers.set("X-Local-Token", this.options.token);
    if (init?.body) headers.set("Content-Type", "application/json");

    let res: Response;
    try {
      res = await fetch(`${this.options.baseUrl}${path}`, { ...init, headers });
    } catch (err) {
      throw new BackendUnreachableError(err);
    }

    if (!res.ok) {
      let body: ApiErrorBody | null = null;
      try {
        body = await res.json();
      } catch {
        // non-JSON error body; fall through to generic message
      }
      throw new ApiError(res.status, body?.error.code ?? "internal_error", body?.error.message ?? res.statusText);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "GET" });
  }

  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
  }

  private patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });
  }

  private del<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: "DELETE" });
  }

  // ---- Health -------------------------------------------------------

  /** No auth required — use as a connection probe before asking for a token. */
  health(): Promise<HealthResponse> {
    return this.get("/health");
  }

  // ---- Guilds & channels ---------------------------------------------

  getGuilds(): Promise<{ guilds: Guild[] }> {
    return this.get("/api/guilds");
  }

  getChannels(guildId: string): Promise<{ channels: VoiceChannel[] }> {
    return this.get(`/api/guilds/${encodeURIComponent(guildId)}/channels`);
  }

  // ---- Player (voice connection + playback control) -------------------

  joinVoiceChannel(guildId: string, channelId: string): Promise<{ ok: true; guildId: string; channelId: string }> {
    return this.post(`/api/player/${encodeURIComponent(guildId)}/join`, { channelId });
  }

  leaveVoiceChannel(guildId: string): Promise<{ ok: true }> {
    return this.post(`/api/player/${encodeURIComponent(guildId)}/leave`);
  }

  getPlayerState(guildId: string): Promise<PlayerState> {
    return this.get(`/api/player/${encodeURIComponent(guildId)}`);
  }

  play(guildId: string): Promise<{ ok: true }> {
    return this.post(`/api/player/${encodeURIComponent(guildId)}/play`);
  }

  pause(guildId: string): Promise<{ ok: true }> {
    return this.post(`/api/player/${encodeURIComponent(guildId)}/pause`);
  }

  resume(guildId: string): Promise<{ ok: true }> {
    return this.post(`/api/player/${encodeURIComponent(guildId)}/resume`);
  }

  skip(guildId: string): Promise<{ ok: true }> {
    return this.post(`/api/player/${encodeURIComponent(guildId)}/skip`);
  }

  /** Accepted by the backend but currently a no-op server-side — see doc.md. */
  seek(guildId: string, seconds: number): Promise<{ ok: true }> {
    return this.post(`/api/player/${encodeURIComponent(guildId)}/seek`, { seconds });
  }

  /** level is 0.0-2.0 (1.0 = default). Only applies to the next track that starts. */
  setVolume(guildId: string, level: number): Promise<{ ok: true }> {
    return this.post(`/api/player/${encodeURIComponent(guildId)}/volume`, { level });
  }

  // ---- Queue -----------------------------------------------------------

  getQueue(guildId: string): Promise<{ queue: QueueItem[] }> {
    return this.get(`/api/queue/${encodeURIComponent(guildId)}`);
  }

  addToQueue(guildId: string, body: AddToQueueRequest): Promise<{ position: number; trackId: string }> {
    return this.post(`/api/queue/${encodeURIComponent(guildId)}`, body);
  }

  removeFromQueue(guildId: string, position: number): Promise<{ ok: true }> {
    return this.del(`/api/queue/${encodeURIComponent(guildId)}/${position}`);
  }

  reorderQueue(guildId: string, from: number, to: number): Promise<{ ok: true }> {
    return this.post(`/api/queue/${encodeURIComponent(guildId)}/reorder`, { from, to });
  }

  clearQueue(guildId: string): Promise<{ ok: true }> {
    return this.post(`/api/queue/${encodeURIComponent(guildId)}/clear`);
  }

  // ---- Settings ----------------------------------------------------------

  getSettings(): Promise<{ settings: SettingsMap }> {
    return this.get("/api/settings");
  }

  patchSettings(updates: SettingsMap): Promise<{ settings: SettingsMap }> {
    return this.patch("/api/settings", updates);
  }

  // ---- Playlists -----------------------------------------------------------

  listPlaylists(): Promise<{ playlists: Playlist[] }> {
    return this.get("/api/playlists");
  }

  createPlaylist(name: string): Promise<{ playlist: Playlist }> {
    return this.post("/api/playlists", { name });
  }

  deletePlaylist(playlistId: string): Promise<{ ok: true }> {
    return this.del(`/api/playlists/${encodeURIComponent(playlistId)}`);
  }

  getPlaylistTracks(playlistId: string): Promise<{ tracks: PlaylistTrack[] }> {
    return this.get(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`);
  }

  addTrackToPlaylist(playlistId: string, trackId: string): Promise<{ ok: true }> {
    return this.post(`/api/playlists/${encodeURIComponent(playlistId)}/tracks`, { trackId });
  }

  removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<{ ok: true }> {
    return this.del(`/api/playlists/${encodeURIComponent(playlistId)}/tracks/${encodeURIComponent(trackId)}`);
  }

  // ---- Library (search + local file scanning) --------------------------------

  searchLibrary(query: string): Promise<{ tracks: Track[] }> {
    const q = encodeURIComponent(query);
    return this.get(`/api/library/search?q=${q}`);
  }

  /** Requires `musicFolder` to be set in the backend's config.json. */
  scanLibrary(): Promise<{ jobId: string }> {
    return this.post("/api/library/scan");
  }
}
