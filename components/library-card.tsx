"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  Edit2,
  FolderPlus,
  ListMusic,
  Loader2,
  Music2,
  Play,
  Plus,
  Scissors,
  Search,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLibraryActions, useLibrarySearch } from "@/lib/store/hooks";
import { toast } from "sonner";
import { formatDuration } from "@/components/music-console";
import { RenameTrackDialog } from "@/components/rename-track-dialog";
import { SliceModal } from "@/components/slice-modal";
import { PlaylistDownloadDialog } from "@/components/playlist-download-dialog";
import { AddToPlaylistDialog } from "@/components/add-to-playlist-dialog";
import type { Track } from "@/lib/api/types";

export function LibraryCard({
  queue,
  player,
}: Readonly<{ queue: any; player: any }>) {
  const library = useLibrarySearch();
  const actions = useLibraryActions();

  // Search input state
  const [queryInput, setQueryInput] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Dialog states
  const [renameTrack, setRenameTrack] = useState<Track | null>(null);
  const [sliceTarget, setSliceTarget] = useState<{
    track?: Track | null;
    url?: string;
  } | null>(null);
  const [playlistPromptUrl, setPlaylistPromptUrl] = useState<string | null>(null);
  const [addToPlaylistTrack, setAddToPlaylistTrack] = useState<Track | null>(null);

  const isUrl = queryInput.trim().startsWith("http://") || queryInput.trim().startsWith("https://");

  // Debounced live search when user types text (not URL)
  useEffect(() => {
    if (isUrl) return;

    const timer = setTimeout(() => {
      void library.search(queryInput.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [queryInput, isUrl]);

  // Infinite scroll intersection observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && library.hasMore && !library.loading && !library.loadingMore) {
          void library.loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [library.hasMore, library.loading, library.loadingMore, library.loadMore]);

  const run = async (action: () => Promise<unknown>, message: string) => {
    const toastId = toast.loading("Выполняется…");
    try {
      await action();
      toast.success(message, { id: toastId });
      void library.refetch();
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = queryInput.trim();
    if (!value) {
      void library.search("");
      return;
    }

    if (isUrl) {
      if (value.includes("list=") || value.includes("/playlist")) {
        setPlaylistPromptUrl(value);
      } else {
        void run(() => actions.download({ url: value }), "Трек скачивается в библиотеку");
        setQueryInput("");
      }
    } else {
      void library.search(value);
    }
  };

  const handleClear = () => {
    setQueryInput("");
    void library.search("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Библиотека треков</CardTitle>
            <CardDescription>
              Поиск по вашей коллекции или скачивание аудио по ссылке.
            </CardDescription>
          </div>
          <ListMusic className="size-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Search / download form */}
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Input
              name="query"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ссылка на видео/плейлист или поиск по названию…"
              aria-label="Поиск библиотеки"
              className="pr-8"
            />
            {queryInput && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Очистить поиск"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            variant="secondary"
            disabled={library.loading || actions.loading}
            className="shrink-0"
          >
            {library.loading || actions.loading ? (
              <Loader2 className="size-4 animate-spin mr-1" />
            ) : isUrl ? (
              <Download className="size-4 mr-1" />
            ) : (
              <Search className="size-4 mr-1" />
            )}
            {actions.loading
              ? "Скачивание…"
              : isUrl
                ? "Скачать"
                : "Найти"}
          </Button>
        </form>

        {library.error && (
          <Alert variant="destructive">
            <AlertDescription>{library.error.message}</AlertDescription>
          </Alert>
        )}

        {/* Tracks List with Infinite Scroll */}
        <ScrollArea className="h-[420px] rounded-md border p-2">
          {library.loading && !library.tracks.length ? (
            <div className="flex h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>Загрузка библиотеки треков…</span>
            </div>
          ) : library.tracks.length ? (
            <div className="flex flex-col gap-1">
              {library.tracks.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/70 transition-colors"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
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
                      onClick={() => setAddToPlaylistTrack(track)}
                      aria-label={`Добавить ${track.title} в плейлист`}
                      title="Добавить в плейлист"
                    >
                      <FolderPlus className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setRenameTrack(track)}
                      aria-label={`Переименовать ${track.title}`}
                      title="Переименовать"
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setSliceTarget({ track })}
                      aria-label={`Разрезать ${track.title}`}
                      title="Разрезать на части"
                    >
                      <Scissors className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        void run(
                          () => player.playAdhoc(track.id),
                          "Воспроизведение начато"
                        )
                      }
                      aria-label={`Воспроизвести ${track.title}`}
                      title="Воспроизвести сейчас"
                    >
                      <Play className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        void run(
                          () => queue.addToQueue({ trackId: track.id }),
                          "Трек добавлен в очередь"
                        )
                      }
                      aria-label={`Добавить ${track.title} в очередь`}
                      title="Добавить в очередь"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Infinite scroll sentinel & status */}
              <div ref={sentinelRef} className="py-2 flex items-center justify-center">
                {library.loadingMore ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span>Загрузка следующих треков…</span>
                  </div>
                ) : library.hasMore ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => void library.loadMore()}
                  >
                    Загрузить ещё
                  </Button>
                ) : library.tracks.length > 25 ? (
                  <span className="text-xs text-muted-foreground">Все треки загружены ({library.tracks.length})</span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-sm text-muted-foreground">
              <Music2 className="size-8 mb-2 opacity-40" />
              {queryInput ? (
                <>
                  <p>Ничего не найдено по запросу «{queryInput}»</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={handleClear}
                    className="mt-1 text-xs"
                  >
                    Показать все треки
                  </Button>
                </>
              ) : (
                <>
                  <p>В библиотеке пока нет сохранённых треков.</p>
                  <p className="text-xs mt-1">
                    Вставьте ссылку на YouTube или SoundCloud выше, чтобы скачать трек.
                  </p>
                </>
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Rename Dialog */}
      <RenameTrackDialog
        track={renameTrack}
        open={Boolean(renameTrack)}
        onOpenChange={(open) => !open && setRenameTrack(null)}
        onRenamed={() => {
          void library.refetch();
          void queue.refetch?.();
        }}
      />

      {/* Slice Modal */}
      <SliceModal
        open={Boolean(sliceTarget)}
        onOpenChange={(open) => !open && setSliceTarget(null)}
        track={sliceTarget?.track}
        url={sliceTarget?.url}
        guildId={queue.guildId ?? null}
        onSuccess={() => {
          void library.refetch();
          void queue.refetch?.();
        }}
      />

      {/* Playlist Download Dialog */}
      <PlaylistDownloadDialog
        open={Boolean(playlistPromptUrl)}
        onOpenChange={(open) => !open && setPlaylistPromptUrl(null)}
        url={playlistPromptUrl ?? ""}
        loading={actions.loading}
        onDownloadSingle={() => {
          if (!playlistPromptUrl) return;
          const u = playlistPromptUrl;
          setPlaylistPromptUrl(null);
          void run(() => actions.download({ url: u }), "Трек скачивается в библиотеку");
        }}
        onDownloadPlaylist={() => {
          if (!playlistPromptUrl) return;
          const u = playlistPromptUrl;
          setPlaylistPromptUrl(null);
          void run(
            () => actions.downloadPlaylist({ url: u, createPlaylist: true }),
            "Плейлист скачивается в библиотеку"
          );
        }}
      />

      {/* Add To Playlist Dialog */}
      <AddToPlaylistDialog
        track={addToPlaylistTrack}
        open={Boolean(addToPlaylistTrack)}
        onOpenChange={(open) => !open && setAddToPlaylistTrack(null)}
      />
    </Card>
  );
}
