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

export interface ConsoleLog {
  id: number;
  level: 'debug' | 'info' | 'log' | 'warn' | 'error' | string;
  args: string[];
  stack: string;
  ts: number;
}
