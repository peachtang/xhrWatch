import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { XhrEvent } from './types';

interface WsMessage {
  type: 'event' | 'clear';
  payload?: XhrEvent;
}

export interface UseXhrEventsReturn {
  events: XhrEvent[];
  displayEvents: XhrEvent[];
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  filterText: string;
  setFilterText: (t: string) => void;
  paused: boolean;
  setPaused: (p: boolean) => void;
  status: 'connected' | 'disconnected';
  clear: () => void;
}

export function useXhrEvents(): UseXhrEventsReturn {
  const [events, setEvents] = useState<XhrEvent[]>([]);
  const [displayEvents, setDisplayEvents] = useState<XhrEvent[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterText, setFilterText] = useState('');
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState<'connected' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);

  // 当未暂停时，displayEvents 始终与 events 保持一致；
  // 暂停时 displayEvents 冻结，直到取消暂停才同步。
  useEffect(() => {
    if (!paused) {
      setDisplayEvents(events);
    }
  }, [paused, events]);

  useEffect(() => {
    setSelectedId((id) => {
      if (id == null) return id;
      if (events.some((e) => e.id === id)) return id;
      return null;
    });
  }, [events]);

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
        fetch('/xhr-events')
          .then((r) => r.json())
          .then(({ events: hist }: { events: XhrEvent[] }) => {
            if (closed) return;
            const next = hist || [];
            setEvents(next);
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
        if (data.type === 'event') {
          setEvents((prev) => [...prev, data.payload!]);
        } else if (data.type === 'clear') {
          setEvents([]);
          setDisplayEvents([]);
          setSelectedId(null);
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

  const applyFilter = useCallback(
    (ev: XhrEvent) => {
      if (!filterText) return true;
      const t = filterText.toLowerCase();
      return (ev.url || '').toLowerCase().includes(t) || (ev.method || '').toLowerCase().includes(t);
    },
    [filterText]
  );

  const filteredDisplay = useMemo(
    () => displayEvents.filter(applyFilter),
    [displayEvents, applyFilter]
  );

  const clear = useCallback(() => {
    fetch('/xhr-events', { method: 'DELETE' }).catch(() => {});
  }, []);

  return {
    events,
    displayEvents: filteredDisplay,
    selectedId,
    setSelectedId,
    filterText,
    setFilterText,
    paused,
    setPaused,
    status,
    clear,
  };
}
