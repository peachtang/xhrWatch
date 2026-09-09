---
name: xhrwatch-integration
description: Integrate the xhrWatch XHR/console debug hook into a target H5 project so requests and console logs show up in the xhrWatch panel. 把 xhrWatch 调试钩子接入目标 H5 项目时用。
---

# xhrWatch Integration Guide (for AI Agents)

xhrWatch is a local debugging panel for H5 pages running in game-engine webviews
(no DevTools, no F5, unreliable built-in Network/console). It works by injecting
a hook script into the target page: the hook intercepts `XMLHttpRequest` and
wraps `console.*`, then reports everything over WebSocket to the xhrWatch
backend (Koa on port 3001), which serves a React panel.

Your job when this skill is loaded: help the user wire the hook into their
project. You do NOT need the xhrWatch backend source — the target project only
needs the hook file and a few lines at its entry.

## Prerequisites

- xhrWatch backend is running locally (health check: `curl http://localhost:3001/health` → 200)
- Target project: a web page (Preact/React/Vue/vanilla JS all work — the hook only touches `XMLHttpRequest` and `console`)

## Files

- Hook source: `hook/xhrhook.ts` in the xhrWatch repo (also downloadable from the
  running panel at `http://localhost:3001/download/hook` — always the latest)
- Hook API:
  - `installXhrHook(): void` — intercepts `XMLHttpRequest.open/send`, reports method/url/status/cost/reqBody/resBody
  - `installConsoleHook(): void` — wraps `console.debug/info/log/warn/error`, reports args + stack for error/warn
  - Guarded by `window.__xhrHooked` / `window.__consoleHooked` — calling twice is safe
- WS endpoint (backend default): `ws://localhost:3001/ws`
  - ⚠️ The hook file ships with `WS_URL = 'ws://localhost:28801/ws'`. If the panel
    runs on the default port 3001, change `WS_URL` to `ws://localhost:3001/ws`.
    When in doubt, read the backend's startup log — it prints the WS URL.

## Steps

1. Locate the hook file:
   - Best: `curl -o xhrhook.ts http://localhost:3001/download/hook` (picks up the exact running version)
   - Or copy `hook/xhrhook.ts` from the xhrWatch repo into the target project
   - Check the `WS_URL` constant at the top of the file matches the running
     backend port; fix it if not (see above).
2. Put the file somewhere importable, e.g. `<project>/src/common/xhrhook.ts`
   (match the target project's existing layout — if the project already has a
   similar file, prefer the existing copy and only ensure it is actually invoked).
3. At the page/app entry (e.g. `main.tsx`, `app.ts`, or the bootstrapped module
   that runs before business logic):
   ```ts
   import { installXhrHook, installConsoleHook } from '<relative-or-alias-path>/xhrhook';
   installXhrHook();
   installConsoleHook();
   ```
   Gate on debug environment when the platform supports it, e.g. an IDE/emulator
   runtime check:
   ```ts
   // Platform-dependent example — replace with your runtime's debug check
   if (Platform.isDebugEnv) {
     installXhrHook();
     installConsoleHook();
   }
   ```
   If the platform exposes a runtime environment API to detect an IDE/emulator
   debug context (common in game-engine webviews), gate on that so production
   builds never activate the hook.
   If the project cannot import TS at runtime from that path, fall back to
   injecting the compiled hook script via the page HTML before business code.
4. Rebuild / hot-reload the target page so the hook runs.
5. Verify:
   - Backend log shows the WS client connect
   - Panel (`http://localhost:5173/` in dev, or `http://localhost:3001/` prod) shows new events after the page fires an XHR
   - Console tab shows wrapped console logs (page console still prints normally)

## Constraints & pitfalls

- Do NOT modify business XHR/console behavior. The hook always calls the
  original implementation first; errors inside the hook are swallowed.
- Bodies > 50KB are truncated with `[truncated ...]` — by design.
- If the hook connects from a page served over HTTPS, the panel must also be
  reachable over the same scheme or the WS will be blocked as mixed content —
  for local debugging use an http(s) page hitting `http://localhost:3001`.
- Offline events are queued (max 500) and flushed on reconnect (exponential
  backoff 1s→10s) — events fired while the backend is down are NOT lost unless
  the queue overflows.
- Don't add extra dependencies; don't fork the hook logic — keep the file
  byte-compatible with upstream so upgrades stay trivial.

## Success criteria

The target page fires an XHR (e.g. a getAppData / list / award request), and
the request appears in the xhrWatch panel with method, URL, status, cost,
request body and response body, plus matching console logs on the Console tab.
