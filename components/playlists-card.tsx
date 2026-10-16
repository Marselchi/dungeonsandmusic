"use client";

import { useState } from "react";
import {
  FolderPlus,
  ListMusic,
  Loader2,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
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
import { usePlaylists } from "@/lib/store/hooks";
import { PlaylistDetailDialog } from "@/components/playlist-detail-dialog";
import { toast } from "sonner";
import type { Playlist } from "@/lib/api/types";

export function PlaylistsCard({
  queue,
  player,
}: Readonly<{
  queue: any;
  player: any;
}>) {
  const playlists = usePlaylists();
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [enqueuingId, setEnqueuingId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;

    setIsCreating(true);
    try {
      await playlists.create(name);
      toast.success(`Плейлист «${name}» создан`);
      setNewPlaylistName("");
    } catch (err) {
      toast.error(`Ошибка при создании плейлиста: ${(err as Error).message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleEnqueuePlaylist = async (pl: Playlist, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!queue.guildId) {
      toast.error("Сначала выберите сервер Discord");
      return;
    }

    setEnqueuingId(pl.id);
    const toastId = toast.loading(`Добавление плейлиста «${pl.name}» в очередь…`);
    try {
      const res = await queue.addPlaylistToQueue({ playlistId: pl.id });
      toast.success(
        `Добавлено ${res.count ?? "все"} треков из «${pl.name}» в очередь`,
        { id: toastId }
      );
    } catch (err) {
      toast.error(`Не удалось добавить плейлист: ${(err as Error).message}`, {
        id: toastId,
      });
    } finally {
      setEnqueuingId(null);
    }
  };

  const handleDelete = async (pl: Playlist, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Удалить плейлист «${pl.name}»?`)) return;

    try {
      await playlists.remove(pl.id);
      toast.success(`Плейлист «${pl.name}» удален`);
      if (selectedPlaylist?.id === pl.id) {
        setSelectedPlaylist(null);
      }
    } catch (err) {
      toast.error(`Ошибка удаления: ${(err as Error).message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListMusic className="size-5 text-primary" />
              Плейлисты
            </CardTitle>
            <CardDescription>
              {playlists.data?.length ?? 0} сохранённых коллекций
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Create playlist form */}
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            placeholder="Имя нового плейлиста…"
            className="h-9 text-sm"
          />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={isCreating || !newPlaylistName.trim()}
            className="shrink-0"
          >
            {isCreating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4 mr-1" />
            )}
            Создать
          </Button>
        </form>

        {/* Playlists list */}
        <ScrollArea className="h-64">
          {playlists.loading && !playlists.data?.length ? (
            <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Загрузка плейлистов…</span>
            </div>
          ) : playlists.data?.length ? (
            <div className="flex flex-col gap-1.5">
              {playlists.data.map((playlist) => (
                <div
                  key={playlist.id}
                  onClick={() => setSelectedPlaylist(playlist)}
                  className="group flex items-center justify-between gap-2 rounded-lg bg-muted/40 p-2.5 text-sm hover:bg-accent/70 transition-colors cursor-pointer border border-border/30 hover:border-border"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                      <ListMusic className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {playlist.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(playlist.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      onClick={(e) => void handleEnqueuePlaylist(playlist, e)}
                      disabled={enqueuingId === playlist.id}
                      title="Добавить плейлист в очередь"
                      aria-label={`Добавить ${playlist.name} в очередь`}
                    >
                      {enqueuingId === playlist.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Play className="size-3.5 text-primary" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={(e) => void handleDelete(playlist, e)}
                      title="Удалить плейлист"
                      aria-label={`Удалить ${playlist.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center text-sm text-muted-foreground">
              <FolderPlus className="size-8 mb-2 opacity-40" />
              <p>Плейлистов пока нет.</p>
              <p className="text-xs mt-1">
                Создайте новый выше или нарежьте видео в библиотеке.
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>

      {/* Playlist detail dialog */}
      <PlaylistDetailDialog
        playlist={selectedPlaylist}
        open={Boolean(selectedPlaylist)}
        onOpenChange={(open) => !open && setSelectedPlaylist(null)}
        guildId={queue.guildId ?? null}
        onPlaylistDeleted={() => {
          setSelectedPlaylist(null);
          void playlists.refetch();
        }}
      />
    </Card>
  );
}
