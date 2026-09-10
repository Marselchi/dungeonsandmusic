"use client";

import { useCallback, useEffect, useState } from "react";
import { useBackend } from "./backend-context";
import type {
  AddToQueueRequest,
  Guild,
  Playlist,
  PlaylistTrack,
  PlayerState,
  QueueItem,
  SettingsMap,
  Track,
  VoiceChannel,
} from "../api/types";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

const INITIAL_STATE: AsyncState<any> = { data: null, loading: true, error: null };

/**
 * Subscribes to a guild's events for as long as the calling component is
 * mounted, and cleans up on unmount. Internal helper used by useQueue()
 * and usePlayerState() — most UI code won't call this directly, but it's
 * exported in case a component needs a raw event without a matching
 * fetch (e.g. a toast on `track.ended`).
 */
export function useGuildSubscription(guildId: string | null) {
  const { socket } = useBackend();

  useEffect(() => {
    if (!socket || !guildId) return;
    socket.subscribe(guildId);
    return () => socket.unsubscribe(guildId);
  }, [socket, guildId]);
}

// ---- Guilds & channels -----------------------------------------------------

export function useGuilds() {
  const { api, isPaired } = useBackend();
  const [state, setState] = useState<AsyncState<Guild[]>>(INITIAL_STATE);

  const refetch = useCallback(async () => {
    if (!isPaired) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const { guilds } = await api.getGuilds();
      setState({ data: guilds, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api, isPaired]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}

export function useChannels(guildId: string | null) {
  const { api } = useBackend();
  const [state, setState] = useState<AsyncState<VoiceChannel[]>>(INITIAL_STATE);

  const refetch = useCallback(async () => {
    if (!guildId) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const { channels } = await api.getChannels(guildId);
      setState({ data: channels, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api, guildId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}

// ---- Queue ------------------------------------------------------------------

export function useQueue(guildId: string | null) {
  const { api, socket } = useBackend();
  const [state, setState] = useState<AsyncState<QueueItem[]>>(INITIAL_STATE);
  useGuildSubscription(guildId);

  const refetch = useCallback(async () => {
    if (!guildId) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const { queue } = await api.getQueue(guildId);
      setState({ data: queue, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api, guildId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Re-fetch whenever the backend says this guild's queue changed, rather
  // than trying to apply a diff client-side (see doc.md's WS section).
  useEffect(() => {
    if (!socket || !guildId) return;
    return socket.on("queue.changed", (payload) => {
      if (payload.guildId === guildId) refetch();
    });
  }, [socket, guildId, refetch]);

  const addToQueue = useCallback((body: AddToQueueRequest) => (guildId ? api.addToQueue(guildId, body) : Promise.reject(new Error("No guild selected"))), [api, guildId]);
  const removeFromQueue = useCallback((position: number) => (guildId ? api.removeFromQueue(guildId, position) : Promise.reject(new Error("No guild selected"))), [api, guildId]);
  const reorderQueue = useCallback((from: number, to: number) => (guildId ? api.reorderQueue(guildId, from, to) : Promise.reject(new Error("No guild selected"))), [api, guildId]);
  const clearQueue = useCallback(() => (guildId ? api.clearQueue(guildId) : Promise.reject(new Error("No guild selected"))), [api, guildId]);

  return { ...state, refetch, addToQueue, removeFromQueue, reorderQueue, clearQueue };
}

// ---- Player state + transport controls --------------------------------------

export function usePlayerState(guildId: string | null) {
  const { api, socket } = useBackend();
  const [state, setState] = useState<AsyncState<PlayerState>>(INITIAL_STATE);
  const [voiceChannelId, setVoiceChannelId] = useState<string | null>(null);
  useGuildSubscription(guildId);

  useEffect(() => {
    setVoiceChannelId(null);
  }, [guildId]);

  const refetch = useCallback(async () => {
    if (!guildId) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await api.getPlayerState(guildId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api, guildId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Patch state locally from the event rather than re-fetching — this one
  // event's payload is already everything GET /api/player/:guildId would
  // return except currentTrackId/positionSeconds/volume, so we merge.
  useEffect(() => {
    if (!socket || !guildId) return;
    return socket.on("player.stateChanged", (payload) => {
      if (payload.guildId !== guildId) return;
      setState((s) => (s.data ? { ...s, data: { ...s.data, state: payload.state } } : s));
    });
  }, [socket, guildId]);

  // A new track starting is the one signal that currentTrackId changed —
  // re-fetch fully in that case.
  useEffect(() => {
    if (!socket || !guildId) return;
    return socket.on("track.started", (payload) => {
      if (payload.guildId === guildId) refetch();
    });
  }, [socket, guildId, refetch]);

  useEffect(() => {
    if (!socket || !guildId) return;
    return socket.on("player.positionChanged", (payload) => {
      if (payload.guildId !== guildId) return;
      setState((current) => current.data ? { ...current, data: { ...current.data, positionSeconds: payload.positionSeconds, durationSeconds: payload.durationSeconds, updatedAt: payload.updatedAt } } : current);
    });
  }, [socket, guildId]);

  useEffect(() => {
    if (!socket || !guildId) return;
    const refresh = () => refetch();
    const cleanups = [
      socket.on("voice.connected", (payload) => {
        if (payload.guildId === guildId) {
          setVoiceChannelId(payload.channelId);
          refresh();
        }
      }),
      socket.on("voice.disconnected", (payload) => {
        if (payload.guildId === guildId) {
          setVoiceChannelId(null);
          refresh();
        }
      }),
    ];
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [socket, guildId, refetch]);

  const guard = <T,>(fn: (id: string) => Promise<T>) => (guildId ? fn(guildId) : Promise.reject(new Error("No guild selected")));

  return {
    ...state,
    refetch,
    voiceChannelId,
    join: async (channelId: string) => {
      await guard((id) => api.joinVoiceChannel(id, channelId));
      setVoiceChannelId(channelId);
    },
    leave: async () => {
      await guard((id) => api.leaveVoiceChannel(id));
      setVoiceChannelId(null);
    },
    play: (position?: number) => guard((id) => api.play(id, position)),
    playTrack: (trackId: string) => guard((id) => api.playTrack(id, trackId)),
    pause: () => guard((id) => api.pause(id)),
    resume: () => guard((id) => api.resume(id)),
    skip: () => guard((id) => api.skip(id)),
    seek: (seconds: number) => guard((id) => api.seek(id, seconds)),
    setVolume: (level: number) => guard((id) => api.setVolume(id, level)),
  };
}

// ---- Settings ----------------------------------------------------------------

export function useSettings() {
  const { api, isPaired } = useBackend();
  const [state, setState] = useState<AsyncState<SettingsMap>>(INITIAL_STATE);

  const refetch = useCallback(async () => {
    if (!isPaired) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const { settings } = await api.getSettings();
      setState({ data: settings, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api, isPaired]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const update = useCallback(
    async (updates: SettingsMap) => {
      const { settings } = await api.patchSettings(updates);
      setState({ data: settings, loading: false, error: null });
      return settings;
    },
    [api]
  );

  return { ...state, refetch, update };
}

// ---- Playlists -----------------------------------------------------------------

export function usePlaylists() {
  const { api, isPaired } = useBackend();
  const [state, setState] = useState<AsyncState<Playlist[]>>(INITIAL_STATE);

  const refetch = useCallback(async () => {
    if (!isPaired) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const { playlists } = await api.listPlaylists();
      setState({ data: playlists, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api, isPaired]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(
    async (name: string) => {
      const { playlist } = await api.createPlaylist(name);
      await refetch();
      return playlist;
    },
    [api, refetch]
  );

  const remove = useCallback(
    async (playlistId: string) => {
      await api.deletePlaylist(playlistId);
      await refetch();
    },
    [api, refetch]
  );

  return { ...state, refetch, create, remove };
}

export function usePlaylistTracks(playlistId: string | null) {
  const { api } = useBackend();
  const [state, setState] = useState<AsyncState<PlaylistTrack[]>>(INITIAL_STATE);

  const refetch = useCallback(async () => {
    if (!playlistId) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      const { tracks } = await api.getPlaylistTracks(playlistId);
      setState({ data: tracks, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api, playlistId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addTrack = useCallback(
    async (trackId: string) => {
      if (!playlistId) return;
      await api.addTrackToPlaylist(playlistId, trackId);
      await refetch();
    },
    [api, playlistId, refetch]
  );

  const removeTrack = useCallback(
    async (trackId: string) => {
      if (!playlistId) return;
      await api.removeTrackFromPlaylist(playlistId, trackId);
      await refetch();
    },
    [api, playlistId, refetch]
  );

  return { ...state, refetch, addTrack, removeTrack };
}

// ---- Library (search + local scan) ---------------------------------------------

export function useLibrarySearch() {
  const { api } = useBackend();
  const [state, setState] = useState<AsyncState<Track[]>>({ data: null, loading: false, error: null });

  const search = useCallback(
    async (query: string) => {
      setState((s) => ({ ...s, loading: true }));
      try {
        const { tracks } = await api.searchLibrary(query);
        setState({ data: tracks, loading: false, error: null });
        return tracks;
      } catch (error) {
        setState({ data: null, loading: false, error: error as Error });
        throw error;
      }
    },
    [api]
  );

  return { ...state, search };
}

/** Tracks in-progress scan/download jobs by id, fed entirely by `download.progress` events. */
export function useLibraryActions() {
  const { api } = useBackend();
  const [loading, setLoading] = useState(false);
  const download = useCallback(async (body: { url?: string; query?: string }) => {
    setLoading(true);
    try { return await api.downloadLibrary(body); } finally { setLoading(false); }
  }, [api]);
  const ensure = useCallback(async (trackId: string) => {
    setLoading(true);
    try { return await api.ensureLibraryTrack(trackId); } finally { setLoading(false); }
  }, [api]);
  return { loading, download, ensure };
}

export function useDownloadProgress() {
  const { socket } = useBackend();
  const [jobs, setJobs] = useState<Record<string, { done: number; total: number }>>({});

  useEffect(() => {
    if (!socket) return;
    return socket.on("download.progress", (payload) => {
      setJobs((prev) => ({ ...prev, [payload.jobId]: { done: payload.done, total: payload.total } }));
    });
  }, [socket]);

  return jobs;
}
