"use client";

import { useMemo, useState } from "react";
import { Radio, Server } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBackend } from "@/lib/store/backend-context";
import {
  useChannels,
  useDownloadProgress,
  useGuilds,
  usePlayerState,
  useQueue,
} from "@/lib/store/hooks";
import { NowPlayingCard } from "@/components/now-playing-card";
import { LibraryCard } from "@/components/library-card";
import { QueueCard } from "@/components/queue-card";
import { VoiceChannelCard } from "@/components/voice-channel-card";
import { PlaylistsCard } from "@/components/playlists-card";
import { DownloadProgress } from "@/components/download-progress";

export function MusicConsole() {
  const { socketStatus } = useBackend();
  const guilds = useGuilds();
  const [guildId, setGuildId] = useState<string | null>(null);
  const selectedGuild = useMemo(
    () => guilds.data?.find((guild) => guild.id === guildId),
    [guilds.data, guildId],
  );
  const channels = useChannels(guildId);
  const player = usePlayerState(guildId);
  const queue = useQueue(guildId);
  const progress = useDownloadProgress();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-375 flex-col lg:flex-row">
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b px-6 py-5 lg:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Пульт управления
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {selectedGuild?.name ?? "Выберите сервер"}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Select value={guildId ?? ""} onValueChange={setGuildId}>
                <SelectTrigger className="w-64">
                  {selectedGuild ? (
                    <Avatar className="size-5">
                      <AvatarImage src={selectedGuild.iconUrl ?? undefined} alt="" />
                      <AvatarFallback>{selectedGuild.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <Server data-icon="inline-start" />
                  )}
                  <SelectValue placeholder="Выбрать сервер" />
                </SelectTrigger>
                <SelectContent>
                  {guilds.data?.map((guild) => (
                    <SelectItem key={guild.id} value={guild.id}>
                      <span className="flex items-center gap-2">
                        <Avatar className="size-5">
                          <AvatarImage src={guild.iconUrl ?? undefined} alt="" />
                          <AvatarFallback>{guild.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{guild.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge
                variant="outline"
                className="hidden gap-2 py-1.5 sm:inline-flex"
              >
                <span
                  className={`size-1.5 rounded-full ${socketStatus === "open" ? "bg-primary" : "bg-muted-foreground"}`}
                />
                {socketStatus === "open" ? "Онлайн" : "Офлайн"}
              </Badge>
            </div>
          </header>
          {!guildId ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="max-w-md text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Radio data-icon="inline-start" />
                </div>
                <h2 className="mt-5 text-xl font-semibold">
                  Выберите сервер, чтобы начать
                </h2>
                <p className="mt-2 leading-6 text-muted-foreground">
                  Выберите Discord-сервер в боковой панели, затем голосовой
                  канал для управления музыкой.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)] lg:p-8">
              <div className="flex min-w-0 flex-col gap-6">
                <NowPlayingCard player={player} queue={queue} />
                <LibraryCard queue={queue} player={player} />
              </div>
              <div className="flex min-w-0 flex-col gap-6">
                <QueueCard queue={queue} player={player} />
                <VoiceChannelCard channels={channels} player={player} />
                <PlaylistsCard />
              </div>
            </div>
          )}
        </section>
      </div>
      <DownloadProgress progress={progress} />
    </main>
  );
}

export function formatDuration(seconds: number | null) {
  if (seconds == null) return "—";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
