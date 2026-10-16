"use client";

import { useState } from "react";
import { Disc3, Edit2, Pause, Play, Repeat2, Scissors, SkipForward } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { formatDuration } from "@/components/music-console";
import { RenameTrackDialog } from "@/components/rename-track-dialog";
import { SliceModal } from "@/components/slice-modal";
import type { Track } from "@/lib/api/types";

type Props = { player: any; queue: any };
export function NowPlayingCard({ player, queue }: Readonly<Props>) {
  const [renameTrack, setRenameTrack] = useState<Track | null>(null);
  const [sliceTrack, setSliceTrack] = useState<Track | null>(null);

  const currentTrack = player.data?.currentTrackId
    ? queue.data?.find(
        (item: any) => item.trackId === player.data.currentTrackId,
      )?.track
    : null;
  const position = player.data?.positionSeconds ?? 0;
  const duration = player.data?.durationSeconds ?? currentTrack?.durationSeconds ?? 0;
  const progress = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      toast.success(success);
      await player.refetch();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  const repeatEnabled = player.data?.repeat ?? false;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardDescription>Сейчас играет</CardDescription>
          <CardTitle className="mt-1 text-2xl">
            {currentTrack?.title ?? "Очередь пуста"}
          </CardTitle>
        </div>
        <Badge
          variant={player.data?.state === "playing" ? "default" : "secondary"}
        >
          {player.data?.state === "playing" ? "Играет" : "Пауза"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
            {currentTrack?.thumbnailUrl ? (
              <img
                src={currentTrack.thumbnailUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <Disc3 className="size-10 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">
                {currentTrack?.title ?? "Выберите трек в библиотеке"}
              </p>
              {currentTrack && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => setRenameTrack(currentTrack)}
                    title="Переименовать трек"
                  >
                    <Edit2 className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => setSliceTrack(currentTrack)}
                    title="Разрезать видео на треки"
                  >
                    <Scissors className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDuration(position)} / {formatDuration(duration || null)}
            </p>
            <Progress
              value={progress}
              className="mt-4"
              aria-label="Прогресс воспроизведения"
            />
            <div className="mt-5 flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                onClick={() => void run(() => player.skip(), "Трек пропущен")}
                disabled={!player.data}
              >
                <SkipForward />
              </Button>
              <Button
                size="icon"
                variant={repeatEnabled ? "default" : "outline"}
                onClick={() =>
                  void run(
                    () => player.setRepeat(!repeatEnabled),
                    repeatEnabled ? "Повтор выключен" : "Повтор включен"
                  )
                }
                disabled={!player.data}
                aria-pressed={repeatEnabled}
                aria-label="Зациклить текущий трек"
              >
                <Repeat2 />
              </Button>
              <Button
                size="icon"
                onClick={() =>
                  player.data?.state === "playing"
                    ? void run(() => player.pause(), "Пауза включена")
                    : void run(() => player.resume(), "Воспроизведение продолжено")
                }
                disabled={!player.data}
              >
                {player.data?.state === "playing" ? <Pause /> : <Play />}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Rename Dialog */}
      <RenameTrackDialog
        track={renameTrack}
        open={Boolean(renameTrack)}
        onOpenChange={(open) => !open && setRenameTrack(null)}
        onRenamed={() => {
          void queue.refetch();
          void player.refetch();
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
    </Card>
  );
}
