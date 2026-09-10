# UI Guide

This app currently has **zero UI**. Everything needed to build one is
already wired up: types, a REST client, a WebSocket client, React hooks,
Tailwind + shadcn/ui configured. This doc is the map for whoever (or
whichever future session) builds the actual screens.

Read this before writing any component.

---

## Deployment model — READ THIS FIRST

**This app must stay 100% client-side. No Server Actions, no Route
Handlers (`app/api/**`), no server-side data fetching, no server-only
env vars.**

Why: the backend this UI talks to runs on the *end user's own machine*
(a Discord bot's local backend — see the backend repo's `doc.md`),
reachable at something like `http://localhost:21000`, or a tunnel URL if
they've exposed it. This frontend, however, is meant to be built once and
deployed as a static site to Vercel, where it's edge-cached and served to
whoever opens it — Vercel's servers have no route to `localhost:21000` on
some stranger's laptop. So there is nothing for a Next.js server runtime
to *do* here: every request to the backend has to originate from the
visitor's own browser.

Concretely, this means:

- `next.config.ts` sets `output: "export"`. `bun run build` produces a
  static `out/` directory — plain HTML/CSS/JS — not a server. Don't
  remove `output: "export"` or reach for `output: "standalone"`.
- **Every component that touches `lib/api` or `lib/ws` must be a Client
  Component** (`"use client"` at the top of the file, or a descendant of
  one). `lib/store/backend-context.tsx` is already a client component;
  anything using `useBackend()`, `useQueue()`, etc. is transitively a
  client component too — but the file itself still needs `"use client"`
  if it calls a hook directly.
- Don't add `app/api/*` route handlers. If you think you need one (e.g.
  "to hide the token" or "to avoid CORS"), you don't — see below.
- Don't use Server Actions (`"use server"`) anywhere.
- The backend URL and pairing token are **runtime, per-visitor state**
  (see `lib/store/persistence.ts`), not build-time env vars, because a
  single static deployment serves many different people each running
  their own backend. `NEXT_PUBLIC_BACKEND_URL` in `.env.local` is only a
  *default* pre-fill for the connect form, nothing more.
- CORS: the backend only allows the exact origin configured in its own
  `config.json` (`frontendOrigin`). Whoever runs the backend needs to set
  that to this app's deployed Vercel URL (or `http://localhost:3000` /
  wherever, during local dev). There's no way around this from the
  frontend side — don't try to add a proxy to dodge it; that would
  require a server, which this app doesn't have.

---

## Connection & pairing flow

Before any of the data hooks return anything, the visitor needs to:

1. Enter (or confirm) the **backend URL** — prefilled from
   `NEXT_PUBLIC_BACKEND_URL` / localStorage, editable, since the backend
   might be on a different port or a tunnel domain.
2. Enter the **local pairing token** the backend printed to its console
   on startup.

`useBackend()` (from `lib/store/backend-context.tsx`) exposes:

```ts
const {
  backendUrl, setBackendUrl,   // string, (url: string) => void
  token, setToken,             // string | null, (token: string | null) => void
  api,                         // ApiClient instance, already configured with backendUrl/token
  socket,                      // BackendSocket | null — null until a token is set
  socketStatus,                // "idle" | "connecting" | "authenticating" | "open" | "closed" | "error"
  isPaired,                    // token !== null (does NOT mean the token is valid)
} = useBackend();
```

Setting `token` (non-null) is what triggers `backend-context.tsx` to open
the WebSocket. To actually *validate* the token, call `api.health()` (no
auth needed) to confirm the backend is reachable at all, then something
like `api.getGuilds()` (needs a valid token) — an `ApiError` with
`status === 401` there means the token's wrong.

**The connect/pairing screen is the one piece of UI nothing else works
without.** Build it first: two inputs (backend URL, token), a "Connect"
action, and states for "checking connection" / "bad URL, can't reach it"
(→ `BackendUnreachableError`) / "reachable but token rejected" (→
`ApiError` with `code: "unauthorized"`) / "connected". `socketStatus`
gives you enough to show connection health afterward too.

---

## Data hooks (`lib/store/hooks.ts`)

All of these are `"use client"` and must be called from Client Components.
Each returns at least `{ data, loading, error, refetch }`; most add
action methods alongside. All of them already keep themselves in sync
with the backend's WebSocket events — don't build your own polling.

| Hook | Returns | Notes |
|---|---|---|
| `useGuilds()` | `{ data: Guild[] \| null, loading, error, refetch }` | List of servers the bot is in. |
| `useChannels(guildId)` | same shape, `data: VoiceChannel[]` | Voice channels for the channel picker. |
| `useQueue(guildId)` | `{ data: QueueItem[], ...+ addToQueue, removeFromQueue, reorderQueue, clearQueue }` | Auto-refetches on `queue.changed`. |
| `usePlayerState(guildId)` | `{ data: PlayerState, ...+ join, leave, play, pause, resume, skip, seek, setVolume }` | Auto-updates on `player.stateChanged` / `track.started`. This is your transport-controls hook. |
| `useSettings()` | `{ data: SettingsMap, ...+ update(updates) }` | Global (not per-guild) key/value settings. |
| `usePlaylists()` | `{ data: Playlist[], ...+ create(name), remove(id) }` | |
| `usePlaylistTracks(playlistId)` | `{ data: PlaylistTrack[], ...+ addTrack(trackId), removeTrack(trackId) }` | |
| `useLibrarySearch()` | `{ data: Track[], loading, error, search(query) }` | Call `search()` on submit/debounce — it's not auto-triggered. |
| `useDownloadProgress()` | `Record<jobId, { done, total }>` | Feed a progress indicator when a track is downloading or a library scan is running. `jobId` is the track's id for downloads, or the id returned by `api.scanLibrary()` for folder scans. |
| `useGuildSubscription(guildId)` | nothing (side-effect only) | Low-level; only reach for this if you need a raw WS event with no matching REST resource, e.g. a toast on `track.ended`. |

Every hook that takes `guildId` accepts `string | null` and simply won't
fetch/act until it's non-null — safe to call before the user has picked a
server.

Action methods (`join`, `addToQueue`, `create`, etc.) all return the
underlying promise, so `await` them, wrap in try/catch for `ApiError`, and
show errors accordingly (they don't manage their own error state — only
the `data/loading/error` triple from the initial fetch does).

### Example (illustrative — not a file to create verbatim)

```tsx
"use client";
import { useGuilds, usePlayerState, useQueue } from "@/lib/store/hooks";

function GuildPlayerPanel({ guildId }: { guildId: string }) {
  const player = usePlayerState(guildId);
  const queue = useQueue(guildId);

  if (player.loading) return null; // swap for a shadcn Skeleton
  return (
    <div>
      <p>State: {player.data?.state}</p>
      <button onClick={() => player.pause()}>Pause</button>
      <button onClick={() => player.skip()}>Skip</button>
      <ul>
        {queue.data?.map((item) => <li key={item.position}>{item.track.title}</li>)}
      </ul>
    </div>
  );
}
```

---

## Types (`lib/api/types.ts`, `lib/ws/types.ts`)

Import from `@/lib/api/types` for REST shapes (`Track`, `QueueItem`,
`PlayerState`, `Guild`, `VoiceChannel`, `Playlist`, `PlaylistTrack`,
`SettingsMap`, `AddToQueueRequest`, `ApiErrorBody`, `ApiErrorCode`) and
`@/lib/api/errors` for `ApiError` / `BackendUnreachableError` (both are
real `Error` subclasses — `instanceof` works). `lib/ws/types.ts` has
`ServerEvents`/`ServerEventType` if you ever call `socket.on(...)`
directly instead of going through a hook.

These are hand-kept in sync with the backend's `doc.md` — if the backend
contract changes, update these first, then whatever hooks/components used
the changed shape.

---

## Suggested pages & components

Nothing below exists yet — it's a starting map, not a spec. Feel free to
restructure once you're actually building.

**Connect screen** (`app/page.tsx`, replacing the current placeholder, or
a dedicated route) — backend URL + token inputs, connection status,
gates everything else.

**Once paired**, likely a layout with:

- **Guild/channel picker** — `useGuilds()` + `useChannels()` + `player.join(channelId)`.
- **Now playing / transport controls** — `usePlayerState()`: play/pause/skip
  buttons, a volume slider (`Slider`), current track title/thumbnail.
  Remember `positionSeconds` isn't live yet — don't build a scrubber that
  implies real-time progress.
- **Queue panel** — `useQueue()`: list with thumbnails/titles, a remove
  button per item, drag-to-reorder if you want it (`reorderQueue(from, to)`
  is ready for that). An "add to queue" input that calls `addToQueue({ url })`
  or `addToQueue({ query })`.
- **Playlists** — `usePlaylists()` + `usePlaylistTracks()`: create/delete
  playlists, list tracks, add-from-search.
- **Library search** — `useLibrarySearch()`: a search box + results list,
  each result addable to the queue or a playlist via its `trackId`.
- **Settings** — `useSettings()`: whatever key/values the backend exposes;
  render generically or hardcode known keys as you learn what's there.
- **Download/scan progress** — `useDownloadProgress()`: a toast or small
  progress indicator keyed by `jobId`.

### shadcn/ui components you'll likely want

None are installed yet. `components.json` is configured (New York style,
neutral base color, CSS variables) — install what you need as you go:

```bash
bunx shadcn add button input slider card dialog dropdown-menu \
  skeleton toast sonner scroll-area separator tabs badge avatar
```

Each lands in `components/ui/`. Compose your own feature components
(`components/queue-list.tsx`, `components/now-playing.tsx`, etc.) on top
of those — don't hand-roll primitives shadcn already provides.

---

## Conventions to keep

- Client Components import hooks from `@/lib/store/hooks` and
  `@/lib/store/backend-context`; never construct an `ApiClient` or
  `BackendSocket` directly inside a component — always go through
  `useBackend()`.
- Feature components live in `components/` (not `components/ui/`, which
  is shadcn-generated and should be left alone except via the CLI).
- Keep page components thin — data fetching/mutation logic belongs in
  `lib/store/hooks.ts` (add new hooks there following the existing
  pattern) or in the component itself if it's truly one-off; don't fetch
  directly from `api` inside deeply nested components when a hook would
  do.
- If the backend contract changes, update `lib/api/types.ts` /
  `lib/ws/types.ts` and `lib/api/client.ts` together, before touching any
  component.
