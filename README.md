# Discord Music Bot — Frontend

A Next.js control panel for the [backend](../discord-music-bot). **No UI
has been built yet** — this is the API/data layer scaffold only: types,
REST client, WebSocket client, React hooks, and Tailwind/shadcn config.
See **`UI_GUIDE.md`** before adding any screens.

## Requirements

- [Bun](https://bun.sh) >= 1.1

## Setup

```bash
bun install
cp .env.local.example .env.local   # optional; sets the default backend URL pre-fill
bun run dev
```

## Important: this is a static, fully client-side app

`next.config.ts` sets `output: "export"` on purpose. This app is deployed
as a static bundle (e.g. to Vercel) and talks to a backend running on each
visitor's own machine, entirely from the browser — there's no Next.js
server in production, no Route Handlers, no Server Actions. Full
explanation, including why the backend URL/token are runtime state and not
env vars, is in `UI_GUIDE.md`'s "Deployment model" section. Read it before
writing any component that touches `lib/api` or `lib/ws`.

## Build

```bash
bun run build   # writes static output to out/
bun run serve   # preview the static build locally
```

Deploy `out/` (or just the repo — Vercel detects `output: "export"` and
serves it as a static site automatically).

## Project layout

```
app/
  layout.tsx        wraps the app in BackendProvider, no visual chrome yet
  page.tsx           placeholder — replace once UI work starts
  globals.css        Tailwind + shadcn's default CSS variable theme
lib/
  api/
    types.ts          REST types mirroring the backend's contract
    client.ts          ApiClient — one method per backend endpoint
    errors.ts           ApiError, BackendUnreachableError
  ws/
    types.ts            WebSocket event/message types
    client.ts             BackendSocket — connect/auth/subscribe/reconnect
  store/
    persistence.ts         localStorage helpers for backend URL + token
    backend-context.tsx     BackendProvider / useBackend()
    hooks.ts                 useGuilds, useQueue, usePlayerState, etc.
components/
  ui/                shadcn-generated primitives go here (none installed yet)
UI_GUIDE.md          read this before building any UI
```

## Backend contract

This app's `lib/api` and `lib/ws` types are hand-kept in sync with the
backend's own `doc.md`. If the backend's API changes, update
`lib/api/types.ts`, `lib/ws/types.ts`, and `lib/api/client.ts` first.
