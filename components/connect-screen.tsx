"use client";

import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Link2,
  Loader2,
  Music2,
  Server,
  ShieldCheck,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBackend } from "@/lib/store/backend-context";
import { ApiClient } from "@/lib/api/client";
import { ApiError, BackendUnreachableError } from "@/lib/api/errors";

export function ConnectScreen() {
  const { backendUrl, setBackendUrl, setToken, api } = useBackend();
  const [url, setUrl] = useState(backendUrl);
  const [tokenInput, setTokenInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setChecking(true);
    setError(null);
    const nextUrl = url.trim().replace(/\/$/, "");
    try {
      const nextToken = tokenInput.trim();
      const nextApi = new ApiClient({ baseUrl: nextUrl, token: nextToken });
      const health = await nextApi.health();
      if (health.status !== "ok")
        throw new Error("Бэкенд не сообщил о готовности.");
      await nextApi.getGuilds();
      setBackendUrl(nextUrl);
      setToken(nextToken);
    } catch (cause) {
      setToken(null);
      if (cause instanceof ApiError && cause.status === 401)
        setError(
          "Токен отклонён. Скопируйте токен, напечатанный бэкендом, и попробуйте снова.",
        );
      else if (cause instanceof BackendUnreachableError)
        setError(
          "Не удалось подключиться к бэкенду. Проверьте URL, CORS и запущен ли бот.",
        );
      else
        setError(
          cause instanceof Error
            ? cause.message
            : "Не удалось завершить подключение.",
        );
    } finally {
      setChecking(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1fr_420px]">
          <section className="hidden lg:block">
            <div className="mb-8 flex items-center gap-3 text-primary">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Music2 data-icon="inline-start" />
              </span>
              <span className="font-mono text-sm uppercase tracking-[0.24em]">
                Dungeons & Music
              </span>
            </div>
            <h1 className="max-w-xl text-balance text-6xl font-semibold tracking-tight">
              Ваша музыка, <span className="text-primary">под контролем.</span>
            </h1>
            <p className="mt-6 max-w-lg text-pretty text-lg leading-8 text-muted-foreground">
              Удобная панель управления музыкальным Discord-ботом. Подключитесь один раз и
              управляйте серверами, каналами, очередью и плейлистами в одном месте.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2">
                <ShieldCheck className="size-4 text-primary" /> Локальное
                подключение
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2">
                <Server className="size-4 text-primary" /> Статус бота в реальном времени
              </span>
            </div>
          </section>

          <Card className="border-border/70 bg-card/90 shadow-2xl shadow-black/20">
            <CardHeader className="gap-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Link2 data-icon="inline-start" />
              </div>
              <div>
                <CardTitle className="text-2xl">Подключение к бэкенду</CardTitle>
                <CardDescription className="mt-2 leading-6">
                  Введите локальный URL и токен, который выводится при запуске бота.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle data-icon="inline-start" />
                  <AlertTitle>Ошибка подключения</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="backend-url">URL бэкенда</Label>
                <Input
                  id="backend-url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="http://localhost:21000"
                  autoComplete="url"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pairing-token">Токен подключения</Label>
                <Input
                  id="pairing-token"
                  value={tokenInput}
                  onChange={(event) => setTokenInput(event.target.value)}
                  placeholder="Вставьте локальный токен"
                  type="password"
                  autoComplete="current-password"
                />
              </div>
              <Button
                className="mt-2 w-full"
                onClick={connect}
                disabled={checking || !url.trim() || !tokenInput.trim()}
              >
                {checking ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <ArrowRight data-icon="inline-start" />
                )}{" "}
                {checking ? "Проверка подключения…" : "Подключить бота"}
              </Button>
              <p className="text-center text-xs leading-5 text-muted-foreground">
                URL и токен сохраняются в этом браузере и отправляются напрямую
                на ваш бэкенд.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
