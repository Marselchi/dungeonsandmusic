"use client";

import { Disc3, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  guilds: {
    loading: boolean;
    data?: Array<{ id: string; name: string; iconUrl: string | null }> | null;
  };
  guildId: string | null;
  onSelectGuild: (id: string) => void;
  socketStatus: string;
  onDisconnect: () => void;
};

export function MusicSidebar({
  guilds,
  guildId,
  onSelectGuild,
  socketStatus,
  onDisconnect,
}: Readonly<Props>) {
  return (
    <aside className="flex w-full flex-col border-b bg-card/40 p-5 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Disc3 />
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Dungeons
          </p>
          <p className="text-sm font-medium">& Music</p>
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-2">
        <p className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Серверы
        </p>
        {guilds.loading ? (
          <>
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </>
        ) : (
          guilds.data?.map((guild) => (
            <button
              key={guild.id}
              onClick={() => onSelectGuild(guild.id)}
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent ${guild.id === guildId ? "bg-accent" : ""}`}
            >
              <Avatar className="size-9">
                <AvatarImage src={guild.iconUrl ?? undefined} alt="" />
                <AvatarFallback>
                  {guild.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm">
                {guild.name}
              </span>
              {guild.id === guildId && (
                <span className="size-2 rounded-full bg-primary" />
              )}
            </button>
          ))
        )}
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <Separator />
        <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
          <span
            className={`size-2 rounded-full ${socketStatus === "open" ? "bg-primary" : "bg-muted-foreground"}`}
          />
          {socketStatus === "open" ? "Подключено" : "Подключение…"}
        </div>
        <Button
          variant="ghost"
          className="justify-start text-muted-foreground"
          onClick={onDisconnect}
        >
          <LogOut data-icon="inline-start" />
          Отключиться
        </Button>
      </div>
    </aside>
  );
}
