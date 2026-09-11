"use client";
import { useState } from "react";
import { Play, Plus, Trash2, X } from "lucide-react";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
export function QueueCard({ queue, player }: Readonly<{ queue: any; player: any }>) {
  const [pending, setPending] = useState(false);
  const run = async (action: () => Promise<unknown>, message: string) => {
    setPending(true);
    try { await action(); toast.success(message); await queue.refetch(); } catch (error) { toast.error((error as Error).message); } finally { setPending(false); }
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
          className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_2.25rem_2.25rem] items-center gap-1 rounded-lg p-2 hover:bg-accent"
        >
          <span className="text-center font-mono text-xs text-muted-foreground">
            {item.position + 1}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm" title={item.track.title}>{item.track.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatDuration(item.track.durationSeconds)}
            </p>
          </div>
          <Button className="size-9" size="icon" variant="ghost" onClick={() => void run(() => player.play(item.position), "Воспроизведение начато")} disabled={pending} aria-label={`Воспроизвести ${item.track.title}`}>
            {pending ? <Loader2 className="animate-spin" /> : <Play />}
          </Button>
          <Button className="size-9" size="icon" variant="ghost" onClick={() => void run(() => queue.removeFromQueue(item.position), "Трек удалён из очереди")} aria-label={`Удалить ${item.track.title}`}>
            <X />
          </Button>
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
            <Trash2 />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem(
              "queue",
            ) as HTMLInputElement;
            if (!input.value.trim()) return;
            void queue.addToQueue(
              input.value.trim().startsWith("http")
                ? { url: input.value.trim() }
                : { query: input.value.trim() },
            );
            input.value = "";
          }}
          className="flex gap-2"
        >
          <Input
            name="queue"
            placeholder="Ссылка или поиск"
            aria-label="Добавить в очередь"
          />
          <Button type="submit" size="icon" aria-label="Добавить в очередь">
            <Plus />
          </Button>
        </form>
        <ScrollArea className="h-72">
          {queueContent}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
