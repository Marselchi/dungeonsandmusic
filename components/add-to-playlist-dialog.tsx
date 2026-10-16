"use client";

import { useState } from "react";
import { FolderPlus, ListMusic, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlaylists } from "@/lib/store/hooks";
import { useBackend } from "@/lib/store/backend-context";
import { toast } from "sonner";
import type { Track } from "@/lib/api/types";

interface AddToPlaylistDialogProps {
  track: Track | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToPlaylistDialog({
  track,
  open,
  onOpenChange,
}: AddToPlaylistDialogProps) {
  const { api } = useBackend();
  const { data: playlists, create: createPlaylist, loading } = usePlaylists();
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!track) return null;

  const handleAddToExisting = async (playlistId: string, playlistName: string) => {
    setSubmitting(true);
    try {
      await api.addTrackToPlaylist(playlistId, track.id);
      toast.success(`Трек «${track.title}» добавлен в плейлист «${playlistName}»`);
      onOpenChange(false);
    } catch (err) {
      toast.error(`Ошибка при добавлении в плейлист: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaylistName.trim();
    if (!name) return;

    setSubmitting(true);
    try {
      const pl = await createPlaylist(name);
      await api.addTrackToPlaylist(pl.id, track.id);
      toast.success(
        `Создан плейлист «${name}», трек «${track.title}» добавлен`
      );
      setNewPlaylistName("");
      onOpenChange(false);
    } catch (err) {
      toast.error(`Ошибка при создании плейлиста: ${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="size-5 text-primary" />
            Добавить в плейлист
          </DialogTitle>
          <DialogDescription className="truncate">
            Трек: <span className="font-medium text-foreground">{track.title}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreateAndAdd} className="flex gap-2 my-2">
          <Input
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            placeholder="Создать новый плейлист…"
            className="h-9 text-sm"
          />
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !newPlaylistName.trim()}
            className="shrink-0"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4 mr-1" />
            )}
            Создать
          </Button>
        </form>

        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-2 mb-1">
          Существующие плейлисты:
        </div>

        <ScrollArea className="max-h-60 rounded-md border p-1.5">
          {loading ? (
            <div className="flex h-28 items-center justify-center gap-2 text-muted-foreground text-xs">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>Загрузка плейлистов…</span>
            </div>
          ) : playlists?.length ? (
            <div className="flex flex-col gap-1">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="flex items-center justify-between gap-2 rounded-lg p-2 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ListMusic className="size-4 text-primary shrink-0" />
                    <span className="truncate text-sm font-medium">{pl.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs shrink-0"
                    disabled={submitting}
                    onClick={() => void handleAddToExisting(pl.id, pl.name)}
                  >
                    + Добавить
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
              Плейлистов пока нет. Введите название выше, чтобы создать.
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
