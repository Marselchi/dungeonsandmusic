/**
 * Types mirroring the backend's API contract exactly (see the backend
 * repo's doc.md). Keep these in sync by hand if the backend contract
 * changes — there's no shared package/codegen between the two repos.
 */

export type SourceType = "youtube" | "soundcloud" | "local";

export interface Track {
  id: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  localPath: string | null;
  title: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  addedAt: number; // epoch ms
}

export interface QueueItem {
  guildId: string;
  position: number;
  trackId: string;
  requestedBy: string | null;
  track: Track;
}

export type PlaybackState = "idle" | "playing" | "paused";

export interface PlayerState {
  guildId: string;
  state: PlaybackState;
  currentTrackId: string | null;
  positionSeconds: number;
  durationSeconds: number | null;
  updatedAt: number;
  volume: number; // 0.0 - 2.0, 1.0 = default
}

export interface Guild {
  id: string;
  name: string;
  iconUrl: string | null;
  memberCount: number;
}

export interface VoiceChannel {
  id: string;
  name: string;
}

export interface Playlist {
  id: string;
  name: string;
  createdAt: number;
}

export interface PlaylistTrack extends Track {
  position: number;
}

export type SettingsMap = Record<string, string>;

/** Body accepted by POST /api/queue/:guildId — exactly one of these three shapes. */
export type AddToQueueRequest =
  | { url: string; requestedBy?: string }
  | { query: string; requestedBy?: string }
  | { trackId: string; requestedBy?: string };

export interface HealthResponse {
  status: "ok";
  version: string;
  uptimeSeconds: number;
}

/** Known error codes the backend returns. Treat anything else like "internal_error". */
export type ApiErrorCode =
  | "unauthorized"
  | "bad_request"
  | "not_found"
  | "join_failed"
  | "internal_error";

export interface ApiErrorBody {
  error: { code: ApiErrorCode | string; message: string };
}
