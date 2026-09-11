"use client";
import { ListMusic, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePlaylists } from "@/lib/store/hooks";
export function PlaylistsCard() {
  const playlists = usePlaylists();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Плейлисты</CardTitle>
        <CardDescription>
          {playlists.data?.length ?? 0} сохранённых коллекций
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {playlists.data?.length ? (
          playlists.data.map((playlist) => (
            <div
              key={playlist.id}
              className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm"
            >
              <ListMusic className="size-4 text-primary" />
              <span className="flex-1 truncate">{playlist.name}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => playlists.remove(playlist.id)}
                aria-label={`Удалить ${playlist.name}`}
              >
                <Trash2 />
              </Button>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Плейлисты появятся здесь после создания на сервере.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
