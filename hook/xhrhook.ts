/**
 * XHR 调试钩子
 * 将所有 XHR 请求/响应通过 WebSocket 上报到本地端点（默认 ws://localhost:3001/ws）
 * 通过 window.__xhrHooked 守卫，重复调用安全
 */

const WS_URL = "ws://localhost:3001/ws";
const MAX_BODY = 50 * 1024; // 50KB，超出截断
const MAX_QUEUE = 500; // 断线时最多缓冲的事件数，防止内存无限增长

function truncate(s: unknown, n: number): string {
  if (typeof s !== "string") return s as string;
  return s.length > n
    ? s.slice(0, n) + `...[truncated ${s.length - n} bytes]`
    : s;
}

// —— WS 上报通道：断线自动重连（指数退避），离线期间事件进入有界队列 ——
let ws: WebSocket | null = null;
let wsOpen = false;
let retryDelay = 1000;
const queue: Record<string, unknown>[] = [];

function flush(): void {
  while (wsOpen && queue.length) {
    ws!.send(JSON.stringify({ type: "ingest", payload: queue.shift() }));
  }
}

function connect(): void {
  try {
    ws?.close();
  } catch {}
  ws = new WebSocket(WS_URL);
  ws.onopen = () => {
    wsOpen = true;
    retryDelay = 1000;
    flush();
  };
  ws.onclose = () => {
    wsOpen = false;
    setTimeout(connect, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 10000);
  };
  ws.onerror = () => {
    try {
      ws?.close();
    } catch {}
  };
}

function report(payload: Record<string, unknown>): void {
  try {
    if (wsOpen) {
      ws!.send(JSON.stringify({ type: "ingest", payload }));
    } else {
      queue.push(payload);
      if (queue.length > MAX_QUEUE) queue.shift();
    }
  } catch {
    // 任何异常都吞掉，绝不污染业务 XHR
  }
}

export function installXhrHook(): void {
  const w = window as any;
  if (w.__xhrHooked) return;
  w.__xhrHooked = true;

  connect();

  const OrigOpen = XMLHttpRequest.prototype.open;
  const OrigSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method: string, url: string) {
    (this as any).__hook = {
      method,
      url: String(url),
      startTime: Date.now(),
    };
    return OrigOpen.apply(this, arguments as any);
  };

  XMLHttpRequest.prototype.send = function (body?: any) {
    this.addEventListener("readystatechange", function () {
      if (this.readyState !== 4) return;
      const h = (this as any).__hook || {};
      const cost = Date.now() - (h.startTime || Date.now());

      // 安全地获取 responseText
      // 标准浏览器: responseType 默认 ''，responseText 可读
      // PixUI: responseType 默认 'default'（非标准值），但 responseText 依然可读
      let responseTextSafe = "";
      try {
        // 绕过 XMLHttpRequestResponseType 联合类型（不含 'default'）
        const rt: any = (this as any).responseType;
        if (!rt || rt === "text" || rt === "default") {
          responseTextSafe = this.responseText || "";
        } else {
          responseTextSafe = `[Non-text response: ${rt}]`;
        }
      } catch (e) {
        responseTextSafe = "[Error reading responseText]";
      }
      report({
        method: h.method,
        url: h.url,
        status: this.status,
        cost,
        reqBody: truncate(
          typeof body === "string" ? body : body ? "[binary/object data]" : "",
          MAX_BODY,
        ),
        resBody: truncate(responseTextSafe, MAX_BODY),
        ts: h.startTime,
      });
    });
    return OrigSend.apply(this, arguments as any);
  };
}
