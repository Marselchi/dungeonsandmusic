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
      setBackendUrl(nextUrl);
      const health = await api.health();
      if (health.status !== "ok")
        throw new Error("Backend did not report a healthy status.");
      setToken(tokenInput.trim());
      await api.getGuilds();
    } catch (cause) {
      setToken(null);
      if (cause instanceof ApiError && cause.status === 401)
        setError(
          "That pairing token was rejected. Copy the token printed by your backend and try again.",
        );
      else if (cause instanceof BackendUnreachableError)
        setError(
          "The backend could not be reached. Check the URL, CORS origin, and that the bot is running.",
        );
      else
        setError(
          cause instanceof Error
            ? cause.message
            : "We could not complete the connection.",
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
              Your music, <span className="text-primary">in command.</span>
            </h1>
            <p className="mt-6 max-w-lg text-pretty text-lg leading-8 text-muted-foreground">
              A focused control room for your Discord music bot. Pair once, then
              manage servers, channels, queues, and playlists from one calm
              workspace.
            </p>
            <div className="mt-10 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2">
                <ShieldCheck className="size-4 text-primary" /> Local-first
                pairing
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-2">
                <Server className="size-4 text-primary" /> Live bot status
              </span>
            </div>
          </section>

          <Card className="border-border/70 bg-card/90 shadow-2xl shadow-black/20">
            <CardHeader className="gap-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Link2 data-icon="inline-start" />
              </div>
              <div>
                <CardTitle className="text-2xl">Connect your backend</CardTitle>
                <CardDescription className="mt-2 leading-6">
                  Enter the local URL and pairing token printed when your bot
                  starts.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle data-icon="inline-start" />
                  <AlertTitle>Connection failed</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex flex-col gap-2">
                <Label htmlFor="backend-url">Backend URL</Label>
                <Input
                  id="backend-url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="http://localhost:21000"
                  autoComplete="url"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pairing-token">Pairing token</Label>
                <Input
                  id="pairing-token"
                  value={tokenInput}
                  onChange={(event) => setTokenInput(event.target.value)}
                  placeholder="Paste your local token"
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
                {checking ? "Checking connection…" : "Connect to bot"}
              </Button>
              <p className="text-center text-xs leading-5 text-muted-foreground">
                Your URL and token stay in this browser and are sent directly to
                your backend.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
