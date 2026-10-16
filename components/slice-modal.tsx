"use client";

import { useEffect, useState } from "react";
import { Clock, Loader2, Plus, Scissors, Sparkles, Trash2 } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useLibraryActions } from "@/lib/store/hooks";
import { toast } from "sonner";
import type { Chapter, Track } from "@/lib/api/types";

export interface SliceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track?: Track | null;
  url?: string;
  guildId?: string | null;
  onSuccess?: (createdTracks: Track[]) => void;
}

interface EditableSlice {
  id: string;
  title: string;
  startStr: string;
  endStr: string;
}

export function formatSecondsToTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function parseTimeToSeconds(timeStr: string): number | null {
  const parts = timeStr.trim().split(":").map((p) => Number(p));
  if (parts.some((p) => isNaN(p) || p < 0)) return null;

  if (parts.length === 1) {
    return parts[0]!;
  }
  if (parts.length === 2) {
    const [mins, secs] = parts;
    return mins! * 60 + secs!;
  }
  if (parts.length === 3) {
    const [hrs, mins, secs] = parts;
    return hrs! * 3600 + mins! * 60 + secs!;
  }
  return null;
}

export function SliceModal({
  open,
  onOpenChange,
  track,
  url,
  guildId,
  onSuccess,
}: SliceModalProps) {
  const { sliceTrack, inspectUrl, getTrackChapters, loading: apiLoading } = useLibraryActions();

  const [inspecting, setInspecting] = useState(false);
  const [slicing, setSlicing] = useState(false);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [slices, setSlices] = useState<EditableSlice[]>([]);
  const [availableChapters, setAvailableChapters] = useState<Chapter[]>([]);

  // Options
  const [enqueueInGuild, setEnqueueInGuild] = useState(true);
  const [createPlaylist, setCreatePlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState("");

  useEffect(() => {
    if (!open) {
      setSlices([]);
      setAvailableChapters([]);
      setVideoTitle("");
      setVideoDuration(null);
      return;
    }

    const loadData = async () => {
      setInspecting(true);
      try {
        if (track) {
          setVideoTitle(track.title);
          setVideoDuration(track.durationSeconds);
          setPlaylistName(track.title);
          const chData = await getTrackChapters(track.id);
          if (chData.chapters && chData.chapters.length > 0) {
            setAvailableChapters(chData.chapters);
            // Suggest / pre-fill chapters
            applyChapters(chData.chapters);
          } else {
            // Default initial slice
            setSlices([
              {
                id: crypto.randomUUID(),
                title: `${track.title} - Часть 1`,
                startStr: "0:00",
                endStr: formatSecondsToTime(track.durationSeconds ?? 180),
              },
            ]);
          }
        } else if (url) {
          const res = await inspectUrl(url);
          const meta = res.metadata;
          setVideoTitle(meta.title);
          setVideoDuration(meta.duration);
          setPlaylistName(meta.title);
          if (meta.chapters && meta.chapters.length > 0) {
            setAvailableChapters(meta.chapters);
            applyChapters(meta.chapters);
          } else {
            setSlices([
              {
                id: crypto.randomUUID(),
                title: `${meta.title} - Часть 1`,
                startStr: "0:00",
                endStr: formatSecondsToTime(meta.duration ?? 180),
              },
            ]);
          }
        }
      } catch (err) {
        toast.error(`Не удалось получить данные видео: ${(err as Error).message}`);
      } finally {
        setInspecting(false);
      }
    };

    void loadData();
  }, [open, track, url]);

  const applyChapters = (chaptersList: Chapter[]) => {
    const formatted = chaptersList.map((ch, idx) => ({
      id: crypto.randomUUID(),
      title: ch.title || `Трек ${idx + 1}`,
      startStr: formatSecondsToTime(ch.startTime),
      endStr: formatSecondsToTime(ch.endTime),
    }));
    setSlices(formatted);
  };

  const handleAddSlice = () => {
    const lastSlice = slices[slices.length - 1];
    let defaultStart = "0:00";
    let defaultEnd = "3:00";
    if (lastSlice) {
      defaultStart = lastSlice.endStr;
      const lastSecs = parseTimeToSeconds(lastSlice.endStr) ?? 0;
      defaultEnd = formatSecondsToTime(lastSecs + 180);
    }
    setSlices((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: `Фрагмент ${prev.length + 1}`,
        startStr: defaultStart,
        endStr: defaultEnd,
      },
    ]);
  };

  const handleRemoveSlice = (id: string) => {
    setSlices((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateSlice = (id: string, field: keyof EditableSlice, val: string) => {
    setSlices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slices.length) {
      toast.error("Добавьте хотя бы один фрагмент для нарезки");
      return;
    }

    // Validate timestamps
    const parsedDefinitions: Array<{ title: string; startTime: number; endTime: number }> = [];
    for (let i = 0; i < slices.length; i++) {
      const s = slices[i]!;
      const start = parseTimeToSeconds(s.startStr);
      const end = parseTimeToSeconds(s.endStr);

      if (start == null || end == null) {
        toast.error(`Неверный формат времени в строке ${i + 1} ("${s.startStr}" или "${s.endStr}")`);
        return;
      }
      if (end <= start) {
        toast.error(`Конец фрагмента ${i + 1} должен быть позже начала`);
        return;
      }
      parsedDefinitions.push({
        title: s.title.trim() || `Фрагмент ${i + 1}`,
        startTime: start,
        endTime: end,
      });
    }

    setSlicing(true);
    const toastId = toast.loading("Нарезка видео на треки…");
    try {
      const res = await sliceTrack({
        trackId: track?.id,
        url: track ? undefined : url,
        slices: parsedDefinitions,
        enqueueGuildId: enqueueInGuild && guildId ? guildId : undefined,
        createPlaylistName: createPlaylist && playlistName.trim() ? playlistName.trim() : undefined,
      });

      toast.success(`Успешно нарезано треков: ${res.tracks.length}`, { id: toastId });
      onOpenChange(false);
      onSuccess?.(res.tracks);
    } catch (err) {
      toast.error(`Ошибка при нарезке: ${(err as Error).message}`, { id: toastId });
    } finally {
      setSlicing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="size-5 text-primary" />
              Разрезать видео на отдельные треки
            </DialogTitle>
            <DialogDescription>
              {videoTitle ? (
                <span className="block truncate font-medium text-foreground">
                  {videoTitle}{" "}
                  {videoDuration != null && (
                    <Badge variant="secondary" className="ml-2 font-mono">
                      {formatSecondsToTime(videoDuration)}
                    </Badge>
                  )}
                </span>
              ) : (
                "Укажите временные метки для каждого трека"
              )}
            </DialogDescription>
          </DialogHeader>

          {inspecting ? (
            <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span>Анализ видео и поиск глав…</span>
            </div>
          ) : (
            <div className="my-4 flex flex-col gap-4 overflow-hidden flex-1">
              {availableChapters.length > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-primary/10 p-2.5 px-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    <Sparkles className="size-4" />
                    Найдено глав в YouTube: {availableChapters.length}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => applyChapters(availableChapters)}
                  >
                    Применить главы
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Список треков ({slices.length})
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={handleAddSlice}
                >
                  <Plus className="size-3.5" /> Добавить трек
                </Button>
              </div>

              <ScrollArea className="h-64 rounded-md border p-2">
                <div className="flex flex-col gap-2">
                  {slices.map((slice, index) => (
                    <div
                      key={slice.id}
                      className="flex items-center gap-2 rounded-lg bg-muted/40 p-2"
                    >
                      <span className="w-5 text-center font-mono text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      <Input
                        value={slice.title}
                        onChange={(e) =>
                          handleUpdateSlice(slice.id, "title", e.target.value)
                        }
                        placeholder="Название трека"
                        className="h-8 flex-1 text-xs"
                      />
                      <div className="flex items-center gap-1 text-xs">
                        <Clock className="size-3 text-muted-foreground" />
                        <Input
                          value={slice.startStr}
                          onChange={(e) =>
                            handleUpdateSlice(slice.id, "startStr", e.target.value)
                          }
                          placeholder="0:00"
                          className="h-8 w-16 text-center font-mono text-xs"
                          title="Начало (мм:сс или чч:мм:сс)"
                        />
                        <span className="text-muted-foreground">—</span>
                        <Input
                          value={slice.endStr}
                          onChange={(e) =>
                            handleUpdateSlice(slice.id, "endStr", e.target.value)
                          }
                          placeholder="3:30"
                          className="h-8 w-16 text-center font-mono text-xs"
                          title="Конец (мм:сс или чч:мм:сс)"
                        />
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveSlice(slice.id)}
                        disabled={slices.length <= 1}
                        aria-label="Удалить фрагмент"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex flex-col gap-2 rounded-lg border p-3 text-xs">
                {guildId && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enqueueInGuild}
                      onChange={(e) => setEnqueueInGuild(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>Добавить полученные треки в текущую очередь воспроизведения</span>
                  </label>
                )}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createPlaylist}
                    onChange={(e) => setCreatePlaylist(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span>Собрать нарезку в новый плейлист</span>
                </label>
                {createPlaylist && (
                  <Input
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                    placeholder="Название плейлиста"
                    className="mt-1 h-8 text-xs"
                  />
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={slicing}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={slicing || inspecting || slices.length === 0}
            >
              {slicing && <Loader2 className="mr-2 size-4 animate-spin" />}
              Разрезать и сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
