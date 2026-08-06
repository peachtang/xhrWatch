import { memo, useCallback, useMemo, useState } from 'react';
import { useConsoleLogs } from '../useConsoleLogs';
import { copyText } from '../utils';
import type { ConsoleLog } from '../types';

const LEVELS = ['debug', 'info', 'log', 'warn', 'error'] as const;
type Level = (typeof LEVELS)[number];

function levelClass(level: string): string {
  return LEVELS.includes(level as Level) ? `level-${level}` : 'level-log';
}

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

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 轻量 JSON 语法高亮：键/字符串/数字/布尔/null 用不同颜色
const TOKEN_RE =
  /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|\b(true|false)\b|\b(null)\b/g;

function highlight(text: string): string {
  let out = '';
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    out += escHtml(text.slice(last, m.index));
    if (m[1]) {
      // 字符串后跟冒号 → 键；否则 → 字符串
      out +=
        m[2] !== undefined
          ? `<span class="j-key">${escHtml(m[1])}</span>${escHtml(m[2])}`
          : `<span class="j-str">${escHtml(m[1])}</span>`;
    } else if (m[3] !== undefined) {
      out += `<span class="j-num">${escHtml(m[3])}</span>`;
    } else if (m[4] !== undefined) {
      out += `<span class="j-bool">${escHtml(m[4])}</span>`;
    } else if (m[5] !== undefined) {
      out += `<span class="j-null">${escHtml(m[5])}</span>`;
    }
    last = m.index + m[0].length;
  }
  out += escHtml(text.slice(last));
  return out;
}

export default function ConsolePage() {
  const { logs, status, clear } = useConsoleLogs();
  const [filterText, setFilterText] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [offLevels, setOffLevels] = useState<Set<Level>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const visibleLogs = useMemo(() => {
    const q = filterText.trim();
    return logs.filter((log) => {
      if (offLevels.has(log.level as Level)) return false;
      if (!q) return true;
      const hay = `${log.level}\n${log.args.join('\n')}\n${log.stack}`;
      if (useRegex) {
        try {
          return new RegExp(q).test(hay);
        } catch {
          /* 无效正则 → 退化为纯文本匹配 */
        }
      }
      return hay.toLowerCase().includes(q.toLowerCase());
    });
  }, [logs, offLevels, filterText, useRegex]);

  const toggleLevel = useCallback((lv: Level) => {
    setOffLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lv)) next.delete(lv);
      else next.add(lv);
      return next;
    });
  }, []);

  const toggleExpanded = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <>
      <header className="toolbar console-toolbar">
        <span className="title">Console</span>
        <input
          className="console-search"
          type="text"
          placeholder="filter text or /regex/"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        <label className="console-regex">
          <input
            type="checkbox"
            checked={useRegex}
            onChange={(e) => setUseRegex(e.target.checked)}
          />{' '}
          regex
        </label>
        <div className="console-levels">
          {LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              className={`console-level-chip ${offLevels.has(lv) ? 'off' : ''} level-${lv}`}
              onClick={() => toggleLevel(lv)}
              title={`toggle ${lv}`}
            >
              <span className="dot" />
              {lv}
            </button>
          ))}
        </div>
        <button id="clear" onClick={clear}>
          Clear
        </button>
        <span id="count" className="muted">
          {visibleLogs.length}/{logs.length}
        </span>
        <span id="status" className={`status status-${status}`}>
          {status}
        </span>
      </header>
      <main className="console-main">
        {visibleLogs.length === 0 ? (
          <div className="empty">
            {logs.length === 0 ? 'No console output yet…' : 'No matching logs…'}
          </div>
        ) : (
          <ul className="console-list">
            {visibleLogs.map((log) => (
              <ConsoleLine
                key={log.id}
                log={log}
                expanded={expanded.has(log.id)}
                onToggleExpand={() => toggleExpanded(log.id)}
              />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}

function logContent(log: ConsoleLog): string {
  return log.args.join('\n') + (log.stack ? '\n\n' + log.stack : '');
}

const ConsoleLine = memo(function ConsoleLine({
  log,
  expanded,
  onToggleExpand,
}: {
  log: ConsoleLog;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const content = useMemo(() => logContent(log), [log]);
  // 超过 5 行或 500 字符视为长文本，默认折叠
  const isLong = content.length > 500 || content.split('\n').length > 5;
  const cls = levelClass(log.level);

  return (
    <li className={`console-line ${cls}`}>
      <div className="console-head">
        <span className="console-time">{fmtTime(log.ts)}</span>
        <span className="console-level-badge">{log.level}</span>
        <span className="console-copy">
          <CopyIcon text={content} />
        </span>
      </div>
      <div className={`console-args ${isLong && !expanded ? 'clamped' : ''}`}>
        {log.args.map((a, i) => (
          <pre
            key={i}
            className="console-arg"
            dangerouslySetInnerHTML={{ __html: highlight(a) }}
          />
        ))}
        {log.stack && <pre className="console-stack">{log.stack}</pre>}
      </div>
      {isLong && (
        <button type="button" className="console-expand" onClick={onToggleExpand}>
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </li>
  );
});

function CopyIcon({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle');
  const onClick = async () => {
    const ok = await copyText(text);
    setState(ok ? 'ok' : 'err');
    setTimeout(() => setState('idle'), 1200);
  };
  return (
    <button
      type="button"
      className={`console-copy-btn ${state === 'ok' ? 'ok' : state === 'err' ? 'err' : ''}`}
      onClick={onClick}
      title="Copy log"
    >
      {state === 'ok' ? '✓' : state === 'err' ? '✗' : '⧉'}
    </button>
  );
}
