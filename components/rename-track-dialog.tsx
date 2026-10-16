"use client";

import { useEffect, useState } from "react";
import { Edit2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLibraryActions } from "@/lib/store/hooks";
import { toast } from "sonner";
import type { Track } from "@/lib/api/types";

interface RenameTrackDialogProps {
  track: Track | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenamed?: (updated: Track) => void;
}

export function RenameTrackDialog({
  track,
  open,
  onOpenChange,
  onRenamed,
}: RenameTrackDialogProps) {
  const { renameTrack, loading } = useLibraryActions();
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (track) {
      setTitle(track.title);
    }
  }, [track]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!track || !title.trim()) return;

    try {
      const res = await renameTrack(track.id, title.trim());
      toast.success("Название трека изменено");
      onOpenChange(false);
      onRenamed?.(res.track);
    } catch (err) {
      toast.error(`Ошибка при переименовании: ${(err as Error).message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="size-4 text-primary" />
              Переименовать трек
            </DialogTitle>
            <DialogDescription>
              Введите новое название для трека. Оно обновится в библиотеке и в очереди.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 flex flex-col gap-2">
            <Label htmlFor="track-title">Название</Label>
            <Input
              id="track-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название трека"
              required
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
