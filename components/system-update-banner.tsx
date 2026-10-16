"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Download,
  HelpCircle,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSystemUpdates } from "@/lib/store/hooks";
import { toast } from "sonner";

export function SystemUpdateBanner() {
  const { data, loading, updateYtdlp, updating } = useSystemUpdates();
  const [dismissed, setDismissed] = useState(false);
  const [showHowToDialog, setShowHowToDialog] = useState(false);

  if (dismissed || loading || !data) return null;

  const botUpdate = data.bot?.updateAvailable;
  const ytdlpUpdate = data.ytdlp?.updateAvailable;
  const ffmpegUpdate = data.ffmpeg?.updateAvailable;

  if (!botUpdate && !ytdlpUpdate && !ffmpegUpdate) return null;

  const handleUpdateYtdlp = async () => {
    const toastId = toast.loading("Обновление yt-dlp…");
    try {
      const res = await updateYtdlp();
      toast.success("yt-dlp успешно обновлен!", { id: toastId, description: res.output });
    } catch (err) {
      toast.error(`Не удалось обновить yt-dlp: ${(err as Error).message}`, { id: toastId });
    }
  };

  // 1. Prominent warning when the bot server itself is outdated
  if (botUpdate) {
    return (
      <>
        <div className="border-b border-amber-500/30 bg-amber-500/15 px-6 py-3 transition-all dark:border-amber-500/20 dark:bg-amber-950/40">
          <div className="mx-auto flex max-w-375 flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="size-5" />
              </div>
              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">
                    Используется устаревшая версия бота
                  </p>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                    v{data.bot?.current ?? "0.1.0"} → v{data.bot?.latest}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Старая версия бота может перестать воспроизводить музыку из-за изменений YouTube. Обновите бот для стабильной работы.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 bg-background/80 text-xs hover:bg-background"
                onClick={() => setShowHowToDialog(true)}
              >
                <HelpCircle className="size-3.5" />
                Как обновиться?
              </Button>

              <Button
                size="sm"
                variant="default"
                className="h-8 gap-1.5 bg-amber-600 text-xs text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500"
                asChild
              >
                <a
                  href={data.bot?.releaseUrl ?? "https://github.com/Marselchi/discord-music-bot/releases"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Скачать обновление
                  <ArrowUpRight className="size-3" />
                </a>
              </Button>

              {ytdlpUpdate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={handleUpdateYtdlp}
                  disabled={updating}
                >
                  {updating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                  Обновить yt-dlp
                </Button>
              )}

              <Button
                size="icon"
                variant="ghost"
                className="size-8 text-muted-foreground hover:text-foreground"
                onClick={() => setDismissed(true)}
                aria-label="Закрыть уведомление"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <Dialog open={showHowToDialog} onOpenChange={setShowHowToDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-amber-500" />
                Как обновить Discord Music Bot
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-3 text-sm text-foreground/90">
                  <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      Обновление с версии 0.1.0 (текущая версия)
                    </p>
                    <p className="text-xs leading-relaxed">
                      В версии 0.1.0 еще не было встроенного автообновления, поэтому этот первый переход делается вручную за 1 минуту:
                    </p>
                    <ol className="list-decimal pl-4 text-xs leading-relaxed space-y-1">
                      <li>Остановите текущего бота в консоли (<kbd className="rounded bg-muted px-1 font-mono">Ctrl+C</kbd>).</li>
                      <li>Нажмите <strong>«Скачать обновление»</strong> ниже и скачайте архив для вашей системы (например, <code className="rounded bg-muted px-1">discord-music-bot-windows-x64.zip</code>).</li>
                      <li>Замените файл <code className="rounded bg-muted px-1">bot-server.exe</code> (и <code className="rounded bg-muted px-1">run.bat</code>) в папке с ботом.</li>
                      <li>Запустите бота снова — готово! Все ваши настройки, токен и треки сохранятся.</li>
                    </ol>
                  </div>

                  <div className="space-y-2 rounded-lg border bg-muted/40 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Последующие обновления (начиная со следующей версии)
                    </p>
                    <p className="text-xs leading-relaxed">
                      Новая версия уже умеет обновляться сама: при перезапуске в терминале бот сам спросит: <br />
                      <span className="mt-1 block rounded bg-black/80 p-2 font-mono text-[11px] text-emerald-400">
                        Do you want to update now? (y/N) [default: N in 10s]:
                      </span>
                      и скачает обновление автоматически при нажатии <strong>y</strong>.
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowHowToDialog(false)}>
                Понятно
              </Button>
              <Button size="sm" asChild>
                <a
                  href={data.bot?.releaseUrl ?? "https://github.com/Marselchi/discord-music-bot/releases"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Скачать обновление
                  <ArrowUpRight className="size-3.5" />
                </a>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // 2. Component updates only (yt-dlp or ffmpeg)
  return (
    <div className="border-b bg-amber-500/10 px-6 py-3 transition-all dark:bg-amber-500/15">
      <div className="mx-auto flex max-w-375 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-4" />
          </div>
          <div className="text-sm">
            <p className="font-medium text-foreground">
              Доступны обновления компонентов
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {ytdlpUpdate && (
                <span>
                  <strong>yt-dlp:</strong> {data.ytdlp.current ?? "неизвестно"} →{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {data.ytdlp.latest}
                  </span>
                </span>
              )}
              {ffmpegUpdate && (
                <span>
                  <strong>ffmpeg:</strong> {data.ffmpeg.current ?? "неизвестно"} →{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {data.ffmpeg.latest}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ytdlpUpdate && (
            <Button
              size="sm"
              variant="default"
              className="h-8 gap-1.5 text-xs"
              onClick={handleUpdateYtdlp}
              disabled={updating}
            >
              {updating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Обновить yt-dlp автоматически
            </Button>
          )}

          {ffmpegUpdate && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              asChild
            >
              <a
                href={data.ffmpeg.releaseUrl}
                target="_blank"
                rel="noreferrer"
              >
                Скачать FFmpeg
                <ArrowUpRight className="size-3" />
              </a>
            </Button>
          )}

          <Button
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={() => setDismissed(true)}
            aria-label="Закрыть уведомление"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
