/**
 * XHR 调试钩子
 * 将所有 XHR 请求/响应上报到本地端点（默认 http://localhost:3001/xhr-events）
 * 通过 window.__xhrHooked 守卫，重复调用安全
 */

const ENDPOINT = "http://localhost:3001/xhr-events";
const MAX_BODY = 50 * 1024; // 50KB，超出截断

function truncate(s: unknown, n: number): string {
  if (typeof s !== "string") return s as string;
  return s.length > n
    ? s.slice(0, n) + `...[truncated ${s.length - n} bytes]`
    : s;
}

function post(payload: Record<string, unknown>): void {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", ENDPOINT);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(payload));
  } catch (e) {
    // 任何异常都吞掉，绝不污染业务 XHR
  }
}

export function installXhrHook(): void {
  const w = window as any;
  if (w.__xhrHooked) return;
  w.__xhrHooked = true;

  const OrigOpen = XMLHttpRequest.prototype.open;
  const OrigSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method: string, url: string) {
    (this as any).__hook = {
      method,
      url: String(url),
      startTime: Date.now(),
    };
    // 标记是否是上报自身的接口，防止死循环
    (this as any).__skipHook = String(url) === ENDPOINT;

    // 无论是否 skipHook，都必须调用原生的 open
    return OrigOpen.apply(this, arguments as any);
  };

  XMLHttpRequest.prototype.send = function (body?: any) {
    if ((this as any).__skipHook) {
      return OrigSend.apply(this, arguments as any);
    }

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
      post({
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
