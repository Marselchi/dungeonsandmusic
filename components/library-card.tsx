"use client";

import { Loader2, ListMusic, Music2, Plus, Search } from "lucide-react";
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
import { useLibrarySearch } from "@/lib/store/hooks";
import { formatDuration } from "@/components/music-console";

export function LibraryCard({ queue }: Readonly<{ queue: any }>) {
  const library = useLibrarySearch();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Библиотека</CardTitle>
            <CardDescription>
              Найдите трек и добавьте его в очередь.
            </CardDescription>
          </div>
          <ListMusic className="size-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem(
              "query",
            ) as HTMLInputElement;
            if (input.value.trim()) void library.search(input.value.trim());
          }}
          className="flex gap-2"
        >
          <Input
            name="query"
            placeholder="Название или исполнитель"
            aria-label="Поиск библиотеки"
          />
          <Button type="submit" variant="secondary" disabled={library.loading}>
            {library.loading ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Search data-icon="inline-start" />
            )}{" "}
            Найти
          </Button>
        </form>
        {library.error && (
          <Alert variant="destructive">
            <AlertDescription>{library.error.message}</AlertDescription>
          </Alert>
        )}
        <ScrollArea className="h-64">
          {library.data?.length ? (
            <div className="flex flex-col gap-1">
              {library.data.map((track) => (
                <div
                  key={track.id}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent"
                >
                  <div className="flex size-10 items-center justify-center overflow-hidden rounded bg-muted">
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
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => queue.addToQueue({ trackId: track.id })}
                    aria-label={`Добавить ${track.title}`}
                  >
                    <Plus />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Введите запрос для поиска треков.
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
