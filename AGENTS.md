# AGENTS.md

Guidance for AI coding agents working in this repository. The repo contains **no secrets** — treat the frontend hook, backend API, and panel code as public-safe.

## What this is

Local debugging tool for PixUI H5 activities in game-engine webviews (no DevTools/F5; built-in Network/console unreliable):

- `hook/xhrhook.ts` — injected into the target page; intercepts `XMLHttpRequest` and wraps `console.*`, reports over WS
- `src/index.ts` — Koa backend: WS ingest + REST history + static panel serving
- `src/store.ts` — in-memory ring buffers (XHR 5000 / console 1000), cleared on restart
- `frontend/` — React 18 + Vite 5 panel (routes: `/` Network, `/console`, `/jsonformat`)

## Commands

```bash
npm install            # deps (node_modules present, don't commit)
npm run dev            # Vite 5173 + tsx watch backend 3001 (concurrently)
npm run check          # tsc --noEmit both backend + frontend
npm run build          # type check + vite build → frontend/dist
npm start              # tsx backend only, serves built panel on 3001
PORT=3001 npm start    # override backend port
```

No test framework, no linter configured. Run `npm run check` before committing.

## Ports & proxy (sync all three if changed)

| Where | Default |
|---|---|
| Backend `src/index.ts` (`PORT` env) | 3001 |
| `vite.config.ts` dev proxy (`/xhr-events`, `/console-logs`, `/ws` → backend) | 5173 → 3001 |
| Hook `WS_URL` (per-project copy of `hook/xhrhook.ts`) | ws://localhost:28801/ws ⚠️ |

⚠️ The hook inside `hook/xhrhook.ts` targets **28801**, but this repo's backend listens on **3001** by default and `vite.config.ts` proxies to 3001. The hook copy shipped into each activity project may differ — when debugging "no events in panel", first check which port the injected hook points at, then start the backend on that port (`PORT=28801 npm run dev` won't work with the Vite proxy — proxy is hardcoded to 3001; adjust `vite.config.ts` too if you must run on 28801).

## Data flow

```
target page ──WS {type:'ingest'|'ingest-console'}──► src/index.ts (Koa)
                                                     ├─ WS /ws broadcast (senders excluded, no echo)
                                                     ├─ REST /xhr-events, /console-logs (GET history 500 / DELETE clear)
                                                     └─ static frontend/dist (SPA fallback → index.html)
```

- WS messages: `{type:'ingest'}` (XHR), `{type:'ingest-console'}` (console), broadcast `event/clear`, `console/console-clear` to panel
- POST `/xhr-events` kept as HTTP-compatible ingest entry; JSON body limit 5mb (koa-bodyparser)
- Static dir resolved from `frontend/dist` relative to `src/index.ts` — don't move files without updating the path

## Frontend state essentials

- `useXhrEvents.ts` / `useConsoleLogs.ts`: WS + exponential-backoff reconnect + history pull + pause/resume + filter + clear
- Paused: new events still stored in `events`, UI snapshot (`displayEvents`) frozen; resume re-syncs
- Filtering affects list display only, never storage or selected detail

## Editing rules

- Backend edit → `tsx watch` auto-restarts. Frontend edit → Vite HMR.
- Don't add a catch-all static middleware before API routes in `src/index.ts` — it breaks `/xhr-events` etc.
- Bodies > 50KB truncated with `[truncated ...]` marker — by design, not a bug
- `vanilla-jsoneditor` dep removed; JSON display uses `frontend/src/components/JsonTree.tsx`
- No `market260813`-specific hardcoding in new code — hooks must stay generic (URL from config/params when possible)

## Context files

- `CLAUDE.md` — fuller architecture walkthrough (keep in sync when structure changes)
- `.codegraph/` — local symbol index (run `codegraph init .` after major refactors); gitignored, never commit
