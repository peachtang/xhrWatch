import { useRef, useState } from 'react';
import type { XhrEvent } from '../types';
import { byteSize, copyText, esc, extractFn, formatSize, statusClass } from '../utils';
import { buildEventMarkdown } from '../markdown';
import ContextMenu from './ContextMenu';

interface EventListProps {
  events: XhrEvent[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

interface MenuState {
  x: number;
  y: number;
  ev: XhrEvent;
}

export default function EventList({ events, selectedId, onSelect }: EventListProps) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [toast, setToast] = useState<{ x: number; y: number; text: string } | null>(null);
  const toastTimer = useRef(0);

  const showToast = (x: number, y: number, text: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ x, y, text });
    toastTimer.current = window.setTimeout(() => setToast(null), 1500);
  };

  const copyWithToast = async (x: number, y: number, text: string, label: string) => {
    const ok = await copyText(text);
    showToast(x, y, ok ? `✓ ${label}` : '✗ 复制失败');
  };

  const handleContextMenu = (e: React.MouseEvent, ev: XhrEvent) => {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, ev });
  };

  return (
    <section className="list">
      <table id="rows">
        <thead>
          <tr>
            <th>Method</th>
            <th>URL / fn</th>
            <th>Status</th>
            <th>Cost</th>
            <th>Size</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => {
            const fn = extractFn(ev.url) || '(no fn)';
            const m = (ev.method || 'OTHER').toUpperCase();
            const size = byteSize(ev.resBody);
            return (
              <tr
                key={ev.id}
                className={selectedId === ev.id ? 'selected' : ''}
                onClick={() => onSelect(ev.id)}
                onContextMenu={(e) => handleContextMenu(e, ev)}
              >
                <td>
                  <span className={`method method-${m}`}>{esc(ev.method || '')}</span>
                </td>
                <td className="url-cell" title={esc(ev.url || '')}>
                  <span className="url-fn">{esc(fn)}</span>
                </td>
                <td>
                  <span className={statusClass(ev.status)}>{ev.status}</span>
                </td>
                <td>{ev.cost}ms</td>
                <td>{formatSize(size)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {events.length === 0 && (
        <div id="empty" className="empty">
          no events yet · 等 market260813 触发 XHR
        </div>
      )}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            {
              key: 'copy-md',
              label: '📋 复制为 Markdown (Params + Request + Response)',
              onClick: () =>
                copyWithToast(menu.x, menu.y, buildEventMarkdown(menu.ev), '已复制 Markdown'),
            },
            {
              key: 'copy-url',
              label: '🔗 复制 URL',
              onClick: () => copyWithToast(menu.x, menu.y, menu.ev.url, '已复制 URL'),
            },
          ]}
        />
      )}
      {toast && (
        <div className="ctx-toast" style={{ left: toast.x, top: toast.y }}>
          {esc(toast.text)}
        </div>
      )}
    </section>
  );
}
