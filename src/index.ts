import Koa from 'koa';
import Router from '@koa/router';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import { WebSocketServer, type WebSocket } from 'ws';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { store } from './store';

const PUBLIC = fileURLToPath(new URL('../public', import.meta.url));

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

const app = new Koa();
const router = new Router();

// 跨域 + 简单日志 + body 解析
app.use(cors({ origin: '*', credentials: false }));
app.use(async (ctx, next) => {
  const t0 = Date.now();
  await next();
  console.log(`[${ctx.method}] ${ctx.url} -> ${ctx.status} (${Date.now() - t0}ms)`);
});
app.use(bodyParser({ jsonLimit: '5mb' }));

// 静态文件：/ -> public/index.html；/_/xxx -> public/xxx
app.use(async (ctx, next) => {
  if (ctx.method !== 'GET') return next();
  let rel: string;
  if (ctx.path === '/' || ctx.path === '') rel = '/index.html';
  else if (ctx.path.startsWith('/_/')) rel = '/' + ctx.path.slice(3);
  else return next();

  const full = join(PUBLIC, rel);
  try {
    statSync(full);
  } catch {
    ctx.status = 404;
    return;
  }
  const data = readFileSync(full);
  ctx.type = MIME[extname(full)] || 'application/octet-stream';
  ctx.body = data;
});

router.get('/health', (ctx) => {
  ctx.body = { ok: true, ts: Date.now() };
});

router.post('/xhr-events', (ctx) => {
  const ev = (ctx.request as any).body || {};
  const stored = store.push(ev);
  broadcast({ type: 'event', payload: stored });
  ctx.body = { ok: true, id: stored.id };
});

router.get('/xhr-events', (ctx) => {
  ctx.body = { events: store.recent(500) };
});

router.delete('/xhr-events', (ctx) => {
  store.clear();
  broadcast({ type: 'clear' });
  ctx.body = { ok: true };
});

app.use(router.routes()).use(router.allowedMethods());

// 单 http server 同时托管 Koa + WS upgrade
const clients = new Set<WebSocket>();
function broadcast(msg: unknown) {
  const data = JSON.stringify(msg);
  for (const ws of clients) {
    if (ws.readyState === 1 /* OPEN */) ws.send(data);
  }
}

const server = createServer(app.callback());
const wss = new WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws) => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});

const port = Number(process.env.PORT ?? 3001);
server.listen(port, () => {
  console.log(`xhr-watch listening on http://localhost:${port}`);
  console.log(`  GET    /              panel UI`);
  console.log(`  POST   /xhr-events    <- market260813 AOP hook`);
  console.log(`  GET    /xhr-events    history (last 500)`);
  console.log(`  DELETE /xhr-events    clear all`);
  console.log(`  WS     ws://localhost:${port}/ws  push`);
});