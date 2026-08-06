import { useConsoleLogs } from '../useConsoleLogs';
import type { ConsoleLog } from '../types';

const LEVEL_CLASS: Record<string, string> = {
  debug: 'console-debug',
  info: 'console-info',
  log: 'console-log',
  warn: 'console-warn',
  error: 'console-error',
};

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  const hms = d.toLocaleTimeString(undefined, {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${hms}.${ms}`;
}

export default function ConsolePage() {
  const { logs, status, clear } = useConsoleLogs();

  return (
    <>
      <header className="toolbar">
        <span className="title">Console</span>
        <button id="clear" onClick={clear}>
          Clear
        </button>
        <span id="count" className="muted">
          {logs.length} logs
        </span>
        <span id="status" className={`status status-${status}`}>
          {status}
        </span>
      </header>
      <main className="console-main">
        {logs.length === 0 ? (
          <div className="empty">No console output yet…</div>
        ) : (
          <ul className="console-list">
            {logs.map((log) => (
              <ConsoleLine key={log.id} log={log} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function ConsoleLine({ log }: { log: ConsoleLog }) {
  const cls = LEVEL_CLASS[log.level] || 'console-log';
  return (
    <li className={`console-line ${cls}`}>
      <div className="console-head">
        <span className="console-time">{fmtTime(log.ts)}</span>
        <span className="console-level">{log.level}</span>
      </div>
      <div className="console-args">
        {log.args.map((a, i) => (
          <pre key={i} className="console-arg">
            {a}
          </pre>
        ))}
      </div>
      {log.stack && <pre className="console-stack">{log.stack}</pre>}
    </li>
  );
}
