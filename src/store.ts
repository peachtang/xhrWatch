// 5000 条环形缓冲：超过容量覆盖最老的；进程重启即清空（dev tool 可接受）
export interface XhrEvent {
  id: number;
  method: string;
  url: string;
  status: number;
  cost: number;
  reqBody: string;
  resBody: string;
  ts: number;
}

const MAX = 5000;
const buf: XhrEvent[] = [];
let nextId = 1;

export const store = {
  push(ev: Omit<XhrEvent, 'id'>): XhrEvent {
    const item: XhrEvent = { ...ev, id: nextId++ };
    buf.push(item);
    if (buf.length > MAX) buf.shift();
    return item;
  },
  recent(n = 500): XhrEvent[] {
    return buf.slice(-n);
  },
  clear(): void {
    buf.length = 0;
  },
};

// —— console 日志环形缓冲（与 XHR 事件分开存储） ——
export interface ConsoleLog {
  id: number;
  level: string;
  args: string[];
  stack: string;
  ts: number;
}

const CMAX = 1000;
const cbuf: ConsoleLog[] = [];
let cnextId = 1;

export const consoleStore = {
  push(ev: Omit<ConsoleLog, 'id'>): ConsoleLog {
    const item: ConsoleLog = { ...ev, id: cnextId++ };
    cbuf.push(item);
    if (cbuf.length > CMAX) cbuf.shift();
    return item;
  },
  recent(n = 500): ConsoleLog[] {
    return cbuf.slice(-n);
  },
  clear(): void {
    cbuf.length = 0;
  },
};