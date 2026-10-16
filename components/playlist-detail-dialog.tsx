"use client";

import { useState } from "react";
import {
  ListMusic,
  Loader2,
  Music2,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { usePlaylistTracks } from "@/lib/store/hooks";
import { useBackend } from "@/lib/store/backend-context";
import { formatDuration } from "@/components/music-console";
import { toast } from "sonner";
import type { Playlist, PlaylistTrack } from "@/lib/api/types";

interface PlaylistDetailDialogProps {
  playlist: Playlist | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guildId?: string | null;
  onPlaylistDeleted?: () => void;
}

export function PlaylistDetailDialog({
  playlist,
  open,
  onOpenChange,
  guildId,
  onPlaylistDeleted,
}: PlaylistDetailDialogProps) {
  const { api } = useBackend();
  const { data: tracks, loading, removeTrack, refetch } = usePlaylistTracks(
    open && playlist ? playlist.id : null
  );

  const [enqueuing, setEnqueuing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!playlist) return null;

  const totalDuration =
    tracks?.reduce((acc, t) => acc + (t.durationSeconds ?? 0), 0) ?? 0;

  const handleEnqueueAll = async () => {
    if (!guildId) {
      toast.error("Сначала выберите сервер Discord");
      return;
    }
    if (!tracks?.length) {
      toast.error("В этом плейлисте нет треков");
      return;
    }

    setEnqueuing(true);
    const toastId = toast.loading(`Добавление плейлиста «${playlist.name}» в очередь…`);
    try {
      const res = await api.enqueuePlaylist(guildId, { playlistId: playlist.id });
      toast.success(
        `Добавлено ${res.count} треков из плейлиста «${playlist.name}» в очередь!`,
        { id: toastId }
      );
    } catch (err) {
      toast.error(`Не удалось добавить плейлист: ${(err as Error).message}`, {
        id: toastId,
      });
    } finally {
      setEnqueuing(false);
    }
  };

  const handlePlayAdHoc = async (track: PlaylistTrack) => {
    if (!guildId) {
      toast.error("Сначала выберите сервер Discord");
      return;
    }
    try {
      await api.playAdhoc(guildId, track.id);
      toast.success(`Воспроизведение: ${track.title}`);
    } catch (err) {
      toast.error(`Ошибка воспроизведения: ${(err as Error).message}`);
    }
  };

  const handleEnqueueSingle = async (track: PlaylistTrack) => {
    if (!guildId) {
      toast.error("Сначала выберите сервер Discord");
      return;
    }
    try {
      await api.addToQueue(guildId, { trackId: track.id });
      toast.success(`Трек добавлен в очередь: ${track.title}`);
    } catch (err) {
      toast.error(`Ошибка добавления в очередь: ${(err as Error).message}`);
    }
  };

  const handleRemoveTrack = async (trackId: string, trackTitle: string) => {
    try {
      await removeTrack(trackId);
      toast.success(`Трек «${trackTitle}» удален из плейлиста`);
    } catch (err) {
      toast.error(`Не удалось удалить трек: ${(err as Error).message}`);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!confirm(`Вы действительно хотите удалить плейлист «${playlist.name}»?`)) {
      return;
    }
    setDeleting(true);
    try {
      await api.deletePlaylist(playlist.id);
      toast.success(`Плейлист «${playlist.name}» удален`);
      onOpenChange(false);
      onPlaylistDeleted?.();
    } catch (err) {
      toast.error(`Не удалось удалить плейлист: ${(err as Error).message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] sm:max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 truncate text-lg">
              <ListMusic className="size-5 text-primary shrink-0" />
              <span className="truncate">{playlist.name}</span>
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs shrink-0">
              {tracks ? `${tracks.length} треков` : "Загрузка…"}
            </Badge>
          </div>
          <DialogDescription className="flex items-center gap-2 text-xs">
            <span>
              Создан: {new Date(playlist.createdAt).toLocaleDateString()}
            </span>
            {totalDuration > 0 && (
              <>
                <span>•</span>
                <span>Общая длительность: {formatDuration(totalDuration)}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 min-h-0 my-2">
          {loading ? (
            <div className="flex h-56 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>Загрузка треков плейлиста…</span>
            </div>
          ) : tracks?.length ? (
            <ScrollArea className="h-[360px] rounded-md border p-2">
              <div className="flex flex-col gap-1.5">
                {tracks.map((track, idx) => (
                  <div
                    key={`${track.id}-${idx}`}
                    className="flex items-center gap-2.5 rounded-lg p-2 hover:bg-accent/60 transition-colors"
                  >
                    <span className="w-6 text-center font-mono text-xs text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                      {track.thumbnailUrl ? (
                        <img
                          src={track.thumbnailUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <Music2 className="size-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {track.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(track.durationSeconds)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => void handlePlayAdHoc(track)}
                        title="Воспроизвести сейчас"
                        aria-label={`Воспроизвести ${track.title}`}
                      >
                        <Play className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => void handleEnqueueSingle(track)}
                        title="Добавить в очередь"
                        aria-label={`Добавить в очередь ${track.title}`}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => void handleRemoveTrack(track.id, track.title)}
                        title="Удалить из плейлиста"
                        aria-label={`Удалить ${track.title} из плейлиста`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex h-56 flex-col items-center justify-center text-sm text-muted-foreground">
              <Music2 className="size-8 mb-2 opacity-40" />
              <p>В этом плейлисте пока нет треков.</p>
              <p className="text-xs mt-1">Добавьте треки из библиотеки кнопкой «В плейлист».</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row justify-between gap-2 mt-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDeletePlaylist}
            disabled={deleting}
            className="self-start sm:self-auto"
          >
            {deleting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 size-4" />
            )}
            Удалить плейлист
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Закрыть
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleEnqueueAll()}
              disabled={enqueuing || !tracks?.length}
            >
              {enqueuing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Play className="mr-2 size-4" />
              )}
              Добавить все в очередь
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
