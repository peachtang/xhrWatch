# xhrWatch

Local XHR / console debugging panel for PixUI H5 activities running inside a game-engine webview (no DevTools, no F5, unreliable Network/console panels).

A hook script injected into the target page intercepts `XMLHttpRequest` and wraps `console.*`, then reports everything over WebSocket to a local Koa backend, which serves a React panel for live inspection.

## Architecture

```
Target page (game-engine webview)
  └─ hook/xhrhook.ts   installXhrHook / installConsoleHook
       intercept XMLHttpRequest.open/send + wrap console.*
       └─ WS ws://localhost:3001/ws  {type:'ingest'|'ingest-console'}
              ├─ Koa backend (src/index.ts) → in-memory ring buffers
              ├─ WS broadcast to panel
              └─ static frontend/dist (React SPA, Vite)
```

## Quick start

```bash
npm install

# Dev: Vite dev server (5173) + tsx watch Koa backend (3001)
npm run dev

# Prod: build frontend, then Koa serves frontend/dist
npm start        # or PORT=3001 npm start

# Type check (backend + frontend)
npm run check
```

Health check:

```bash
curl http://localhost:3001/health   # 200
curl http://localhost:5173/         # 200 (dev panel)
```

Panel: http://localhost:5173/ (dev) or http://localhost:3001/ (prod)

## Injecting the hook

Drop `hook/xhrhook.ts` into the target project (each activity keeps its own copy), then:

```ts
import { installXhrHook, installConsoleHook } from '<path>/xhrhook';
installXhrHook();
installConsoleHook();
```

- Backend port default **3001** (`PORT` env to override). Dev panel **5173** proxies `/xhr-events`, `/console-logs`, `/ws` to 3001.
- ⚠️ If you change ports, sync three places: backend `src/index.ts`, `vite.config.ts`, and the `WS_URL` constant in the hook copy injected into the activity.
- The hook is guarded by `window.__xhrHooked` and swallows all errors — it never pollutes business XHR.

## API

| Method | Path              | Description                              |
|--------|-------------------|------------------------------------------|
| GET    | `/health`         | Health check                             |
| POST   | `/xhr-events`     | HTTP ingest (legacy, WS is primary)      |
| GET    | `/xhr-events`     | History (last 500)                       |
| DELETE | `/xhr-events`     | Clear XHR events                         |
| GET    | `/console-logs`   | Console history (last 500)               |
| DELETE | `/console-logs`   | Clear console logs                       |
| WS     | `/ws`             | Ingest (`ingest`/`ingest-console`) + push |

## Panel features

- Live WS stream with exponential-backoff reconnect, history pull, pause/resume, filter, clear
- XHR list (method / url / status / cost) + detail tabs: Params / Request / Response (collapsible JsonTree)
- Console page color-coded by level (error / warn / info / log / debug)
- Copy request as Markdown via context menu

## Notes

- Buffers are in-memory ring buffers (XHR 5000 / console 1000) — cleared on restart.
- Bodies over 50KB are truncated with a `[truncated ...]` marker (by design).
- Reconnect: exponential backoff 1s→10s; offline events queue in a bounded buffer (500) and flush on reconnect.

## Tech stack

TypeScript · Koa 2 + ws · React 18 (Vite 5) · react-router-dom 7

## Docs for AI agents

See `CLAUDE.md` / `AGENTS.md` for architecture details and development conventions.
