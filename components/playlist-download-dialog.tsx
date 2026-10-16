"use client";

import { ListMusic, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PlaylistDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  loading?: boolean;
  onDownloadPlaylist: () => void;
  onDownloadSingle: () => void;
}

export function PlaylistDownloadDialog({
  open,
  onOpenChange,
  url,
  loading = false,
  onDownloadPlaylist,
  onDownloadSingle,
}: PlaylistDownloadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListMusic className="size-5 text-primary" />
            Обнаружен плейлист
          </DialogTitle>
          <DialogDescription>
            Вставленная ссылка указывает на плейлист. Как вы хотите его обработать?
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 truncate rounded-lg bg-muted p-2.5 font-mono text-xs text-muted-foreground">
          {url}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onDownloadSingle}
            disabled={loading}
          >
            Только один трек
          </Button>
          <Button
            type="button"
            onClick={onDownloadPlaylist}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Скачать весь плейлист
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
