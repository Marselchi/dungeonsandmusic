"use client";

import { useState } from "react";
import { Edit2, Loader2, Play, Plus, Scissors, Trash2, X } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/components/music-console";
import { RenameTrackDialog } from "@/components/rename-track-dialog";
import { SliceModal } from "@/components/slice-modal";
import { PlaylistDownloadDialog } from "@/components/playlist-download-dialog";
import { toast } from "sonner";
import type { Track } from "@/lib/api/types";

export function QueueCard({
  queue,
  player,
}: Readonly<{ queue: any; player: any }>) {
  const [pending, setPending] = useState(false);
  const [renameTrack, setRenameTrack] = useState<Track | null>(null);
  const [sliceTrack, setSliceTrack] = useState<Track | null>(null);
  const [playlistPromptUrl, setPlaylistPromptUrl] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>, message: string) => {
    setPending(true);
    try {
      await action();
      toast.success(message);
      await queue.refetch();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPending(false);
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("queue") as HTMLInputElement;
    const value = input.value.trim();
    if (!value) return;

    if (value.startsWith("http") && (value.includes("list=") || value.includes("/playlist"))) {
      setPlaylistPromptUrl(value);
    } else {
      void run(
        () =>
          queue.addToQueue(
            value.startsWith("http") ? { url: value } : { query: value }
          ),
        "Трек добавлен в очередь"
      );
    }
    input.value = "";
  };

  const queueItems = queue.data ?? [];
  const queueContent = queue.loading ? (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
      <Skeleton className="h-12" />
    </div>
  ) : queueItems.length > 0 ? (
    <div className="flex flex-col gap-1">
      {queueItems.map((item: any) => (
        <div
          key={`${item.trackId}-${item.position}`}
          className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg p-2 hover:bg-accent"
        >
          <span className="text-center font-mono text-xs text-muted-foreground">
            {item.position + 1}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={item.track.title}>
              {item.track.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDuration(item.track.durationSeconds)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              className="size-8"
              size="icon"
              variant="ghost"
              onClick={() => setRenameTrack(item.track)}
              title="Переименовать"
              aria-label={`Переименовать ${item.track.title}`}
            >
              <Edit2 className="size-3.5" />
            </Button>
            <Button
              className="size-8"
              size="icon"
              variant="ghost"
              onClick={() => setSliceTrack(item.track)}
              title="Разрезать на части"
              aria-label={`Разрезать ${item.track.title}`}
            >
              <Scissors className="size-3.5" />
            </Button>
            <Button
              className="size-8"
              size="icon"
              variant="ghost"
              onClick={() =>
                void run(
                  () => player.play(item.position),
                  "Воспроизведение начато"
                )
              }
              disabled={pending}
              aria-label={`Воспроизвести ${item.track.title}`}
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
            </Button>
            <Button
              className="size-8"
              size="icon"
              variant="ghost"
              onClick={() =>
                void run(
                  () => queue.removeFromQueue(item.position),
                  "Трек удалён из очереди"
                )
              }
              aria-label={`Удалить ${item.track.title}`}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Очередь пуста.
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Очередь</CardTitle>
            <CardDescription>
              {queue.data?.length ?? 0} треков ожидают
            </CardDescription>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => queue.clearQueue()}
            aria-label="Очистить очередь"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          <Input
            name="queue"
            placeholder="Ссылка (видео/плейлист) или поиск"
            aria-label="Добавить в очередь"
          />
          <Button type="submit" size="icon" aria-label="Добавить в очередь">
            <Plus />
          </Button>
        </form>
        <ScrollArea className="h-72">{queueContent}</ScrollArea>
      </CardContent>

      {/* Rename Dialog */}
      <RenameTrackDialog
        track={renameTrack}
        open={Boolean(renameTrack)}
        onOpenChange={(open) => !open && setRenameTrack(null)}
        onRenamed={() => {
          void queue.refetch();
        }}
      />

      {/* Slice Modal */}
      <SliceModal
        open={Boolean(sliceTrack)}
        onOpenChange={(open) => !open && setSliceTrack(null)}
        track={sliceTrack}
        guildId={queue.guildId ?? null}
        onSuccess={() => {
          void queue.refetch();
        }}
      />

      {/* Playlist Enqueue Dialog */}
      <PlaylistDownloadDialog
        open={Boolean(playlistPromptUrl)}
        onOpenChange={(open) => !open && setPlaylistPromptUrl(null)}
        url={playlistPromptUrl ?? ""}
        loading={pending}
        onDownloadSingle={() => {
          if (!playlistPromptUrl) return;
          const u = playlistPromptUrl;
          setPlaylistPromptUrl(null);
          void run(
            () => queue.addToQueue({ url: u }),
            "Трек добавлен в очередь"
          );
        }}
        onDownloadPlaylist={() => {
          if (!playlistPromptUrl) return;
          const u = playlistPromptUrl;
          setPlaylistPromptUrl(null);
          void run(
            () => queue.addPlaylistToQueue(u),
            "Все треки из плейлиста добавлены в очередь"
          );
        }}
      />
    </Card>
  );
}
