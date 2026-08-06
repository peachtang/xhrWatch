import type { XhrEvent } from '../types';
import { byteSize, esc, extractFn, formatSize, statusClass } from '../utils';

interface EventListProps {
  events: XhrEvent[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function EventList({ events, selectedId, onSelect }: EventListProps) {
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
    </section>
  );
}
