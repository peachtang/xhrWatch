import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConsoleLog } from './types';

interface WsMessage {
  type: 'console' | 'console-clear';
  payload?: ConsoleLog;
}

const MAX_DISPLAY = 1000; // 前端最多保留 1000 条，避免 DOM 过大

export interface UseConsoleLogsReturn {
  logs: ConsoleLog[];
  status: 'connected' | 'disconnected';
  clear: () => void;
}

export function useConsoleLogs(): UseConsoleLogsReturn {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const [status, setStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let backoff = 1000;
    let closed = false;

    function connect() {
      setStatus('disconnected');
      const ws = new WebSocket(`ws://${location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        backoff = 1000;
        fetch('/console-logs')
          .then((r) => r.json())
          .then(({ logs: hist }: { logs: ConsoleLog[] }) => {
            if (closed) return;
            setLogs((hist || []).slice(-MAX_DISPLAY));
          })
          .catch(() => {});
      };

      ws.onmessage = (msg) => {
        if (closed) return;
        let data: WsMessage;
        try {
          data = JSON.parse(msg.data);
        } catch {
          return;
        }
        if (data.type === 'console' && data.payload) {
          setLogs((prev) => [...prev, data.payload!].slice(-MAX_DISPLAY));
        } else if (data.type === 'console-clear') {
          setLogs([]);
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        if (closed) return;
        setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 10000);
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    }

    connect();
    return () => {
      closed = true;
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, []);

  const clear = useCallback(() => {
    fetch('/console-logs', { method: 'DELETE' }).catch(() => {});
    setLogs([]);
  }, []);

  return { logs, status, clear };
}
