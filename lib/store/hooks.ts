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
  Chapter,
  DownloadPlaylistRequest,
  DownloadPlaylistResponse,
  InspectResponse,
  SliceTrackRequest,
  SliceTrackResponse,
  SystemUpdatesResponse,
  BinaryVersionInfo,
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
      if (payload.guildId === guildId || payload.guildId === "*") refetch();
    });
  }, [socket, guildId, refetch]);

  const addToQueue = useCallback((body: AddToQueueRequest) => (guildId ? api.addToQueue(guildId, body) : Promise.reject(new Error("No guild selected"))), [api, guildId]);
  const addPlaylistToQueue = useCallback((payload: string | { url?: string; playlistId?: string }) => (guildId ? api.enqueuePlaylist(guildId, payload) : Promise.reject(new Error("No guild selected"))), [api, guildId]);
  const removeFromQueue = useCallback((position: number) => (guildId ? api.removeFromQueue(guildId, position) : Promise.reject(new Error("No guild selected"))), [api, guildId]);
  const reorderQueue = useCallback((from: number, to: number) => (guildId ? api.reorderQueue(guildId, from, to) : Promise.reject(new Error("No guild selected"))), [api, guildId]);
  const clearQueue = useCallback(() => (guildId ? api.clearQueue(guildId) : Promise.reject(new Error("No guild selected"))), [api, guildId]);

  return { ...state, refetch, addToQueue, addPlaylistToQueue, removeFromQueue, reorderQueue, clearQueue };
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
    playAdhoc: (trackId: string) => guard((id) => api.playAdhoc(id, trackId)),
    pause: () => guard((id) => api.pause(id)),
    resume: () => guard((id) => api.resume(id)),
    skip: () => guard((id) => api.skip(id)),
    setRepeat: (enabled: boolean) => guard((id) => api.setRepeat(id, enabled)),
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
  const { api, isPaired, socket } = useBackend();
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

  useEffect(() => {
    if (!socket) return;
    return socket.on("playlists.changed", () => {
      refetch();
    });
  }, [socket, refetch]);

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

const PAGE_SIZE = 50;

export function useLibrarySearch() {
  const { api, isPaired } = useBackend();
  const [tracks, setTracks] = useState<Track[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentQuery, setCurrentQuery] = useState("");

  const search = useCallback(
    async (query: string) => {
      setCurrentQuery(query);
      setLoading(true);
      setError(null);
      try {
        const res = await api.searchLibrary(query, PAGE_SIZE, 0);
        setTracks(res.tracks);
        setHasMore(res.tracks.length === PAGE_SIZE);
        return res.tracks;
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [api]
  );

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore || !tracks) return;
    setLoadingMore(true);
    try {
      const offset = tracks.length;
      const res = await api.searchLibrary(currentQuery, PAGE_SIZE, offset);
      setTracks((prev) => (prev ? [...prev, ...res.tracks] : res.tracks));
      setHasMore(res.tracks.length === PAGE_SIZE);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoadingMore(false);
    }
  }, [api, currentQuery, hasMore, loading, loadingMore, tracks]);

  const refetch = useCallback(async () => {
    return await search(currentQuery);
  }, [search, currentQuery]);

  // Initial load when paired
  useEffect(() => {
    if (isPaired) {
      void search("");
    }
  }, [isPaired, search]);

  return {
    data: tracks,
    tracks: tracks ?? [],
    loading,
    loadingMore,
    hasMore,
    error,
    currentQuery,
    search,
    loadMore,
    refetch,
  };
}

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

  const downloadPlaylist = useCallback(async (body: DownloadPlaylistRequest) => {
    setLoading(true);
    try { return await api.downloadPlaylist(body); } finally { setLoading(false); }
  }, [api]);

  const sliceTrack = useCallback(async (body: SliceTrackRequest) => {
    setLoading(true);
    try { return await api.sliceTrack(body); } finally { setLoading(false); }
  }, [api]);

  const inspectUrl = useCallback(async (url: string) => {
    return await api.inspectUrl(url);
  }, [api]);

  const getTrackChapters = useCallback(async (trackId: string) => {
    return await api.getTrackChapters(trackId);
  }, [api]);

  const renameTrack = useCallback(async (trackId: string, title: string) => {
    setLoading(true);
    try { return await api.renameTrack(trackId, title); } finally { setLoading(false); }
  }, [api]);

  return { loading, download, ensure, downloadPlaylist, sliceTrack, inspectUrl, getTrackChapters, renameTrack };
}

export function useDownloadProgress() {
  const { socket } = useBackend();
  const [jobs, setJobs] = useState<Record<string, { done: number; total: number }>>({});

  useEffect(() => {
    if (!socket) return;
    return socket.on("download.progress", (payload) => {
      setJobs((prev) => {
        if (payload.total > 0 && payload.done >= payload.total) {
          const next = { ...prev };
          delete next[payload.jobId];
          return next;
        }
        return { ...prev, [payload.jobId]: { done: payload.done, total: payload.total } };
      });
    });
  }, [socket]);

  const dismiss = useCallback((jobId: string) => {
    setJobs((prev) => {
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
  }, []);

  return { jobs, dismiss };
}

function compareVersions(current: string | null, latest: string | null): boolean {
  if (!current || !latest) return false;
  const cleanCurr = current.replace(/^v/i, "").replace(/^n/i, "").trim();
  const cleanLate = latest.replace(/^v/i, "").replace(/^n/i, "").trim();
  if (cleanCurr === cleanLate) return false;

  const p1 = cleanCurr.split(/[.-]/).map((p) => parseInt(p, 10));
  const p2 = cleanLate.split(/[.-]/).map((p) => parseInt(p, 10));
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (isNaN(num1) || isNaN(num2)) continue;
    if (num2 > num1) return true;
    if (num1 > num2) return false;
  }
  return false;
}

// ---- System & Updates ---------------------------------------------------------

export function useSystemUpdates() {
  const { api, isPaired } = useBackend();
  const [state, setState] = useState<AsyncState<SystemUpdatesResponse>>(INITIAL_STATE);
  const [updating, setUpdating] = useState(false);

  const refetch = useCallback(async (force = false) => {
    if (!isPaired) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      // 1. First probe health to get current bot version (works on ANY bot backend, new or old)
      let currentBotVersion: string | null = null;
      try {
        const health = await api.health();
        currentBotVersion = health.version;
      } catch {
        // ignore
      }

      // 2. Try getting system updates from backend
      let systemData: SystemUpdatesResponse | null = null;
      try {
        systemData = await api.getSystemUpdates(force);
      } catch {
        // old bot backend without /api/system/updates
      }

      // 3. Ensure bot update info is populated accurately
      if (!systemData?.bot || !systemData.bot.latest) {
        let latestTag: string | null = null;
        let releaseUrl = "https://github.com/Marselchi/discord-music-bot/releases/latest";
        try {
          const ghRes = await fetch("https://api.github.com/repos/Marselchi/discord-music-bot/releases/latest", {
            headers: { Accept: "application/vnd.github.v3+json" },
            signal: AbortSignal.timeout(5000),
          });
          if (ghRes.ok) {
            const release = await ghRes.json();
            latestTag = release.tag_name ? release.tag_name.replace(/^v/, "") : null;
            if (release.html_url) releaseUrl = release.html_url;
          }
        } catch {
          // ignore network failure
        }

        const effectiveCurrent = systemData?.bot?.current || currentBotVersion;
        const isOutdated = compareVersions(effectiveCurrent, latestTag);
        const botInfo: BinaryVersionInfo = {
          name: "discord-music-bot",
          current: effectiveCurrent,
          latest: latestTag,
          updateAvailable: isOutdated,
          releaseUrl,
          canAutoUpdate: false,
        };

        if (systemData) {
          systemData = { ...systemData, bot: botInfo };
        } else {
          systemData = {
            bot: botInfo,
            ytdlp: {
              name: "yt-dlp",
              current: null,
              latest: null,
              updateAvailable: false,
              releaseUrl: "https://github.com/yt-dlp/yt-dlp/releases/latest",
              canAutoUpdate: false,
            },
            ffmpeg: {
              name: "ffmpeg",
              current: null,
              latest: null,
              updateAvailable: false,
              releaseUrl: "https://www.gyan.dev/ffmpeg/builds/",
              canAutoUpdate: false,
            },
            checkedAt: Date.now(),
          };
        }
      } else if (currentBotVersion && !systemData.bot.current) {
        systemData.bot.current = currentBotVersion;
      }

      setState({ data: systemData, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api, isPaired]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const updateYtdlp = useCallback(async () => {
    setUpdating(true);
    try {
      const res = await api.updateYtdlp();
      setState({ data: res.status, loading: false, error: null });
      return res;
    } finally {
      setUpdating(false);
    }
  }, [api]);

  return {
    ...state,
    refetch,
    updateYtdlp,
    updating,
    botVersion: state.data?.bot?.current ?? null,
    isBotOutdated: Boolean(state.data?.bot?.updateAvailable),
    latestBotVersion: state.data?.bot?.latest ?? null,
  };
}

