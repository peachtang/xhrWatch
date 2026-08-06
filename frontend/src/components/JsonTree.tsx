import { useState } from 'react';
import { esc } from '../utils';

interface JsonNodeProps {
  value: unknown;
  depth?: number;
}

const MAX_JSON_DEPTH = 8;
const DEFAULT_COLLAPSE_DEPTH = 2;

function JsonNode({ value, depth = 0 }: JsonNodeProps) {
  if (value === null) return <span className="j-null">null</span>;

  switch (typeof value) {
    case 'string':
      return <span className="j-str">"{esc(value)}"</span>;
    case 'number':
      return <span className="j-num">{value}</span>;
    case 'boolean':
      return <span className="j-bool">{String(value)}</span>;
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? value.map((v, i) => [i, v] as const)
    : Object.entries(value as Record<string, unknown>);
  const open = isArray ? '[' : '{';
  const close = isArray ? ']' : '}';

  if (depth >= MAX_JSON_DEPTH) {
    return (
      <span>
        <span className="j-bracket">{open}</span>
        <span className="j-meta">…</span>
        <span className="j-bracket">{close}</span>
      </span>
    );
  }

  if (entries.length === 0) {
    return <span className="j-bracket">{open}{close}</span>;
  }

  const [collapsed, setCollapsed] = useState(depth >= DEFAULT_COLLAPSE_DEPTH);
  const meta = `${entries.length} ${isArray ? (entries.length === 1 ? 'item' : 'items') : (entries.length === 1 ? 'key' : 'keys')}`;

  return (
    <div className={`j-node ${isArray ? 'j-arr' : 'j-obj'} ${collapsed ? 'collapsed' : ''}`}>
      <span className="j-toggle" onClick={() => setCollapsed((c) => !c)}>
        {collapsed ? '▶' : '▼'}
      </span>
      {collapsed ? (
        <>
          <span className="j-bracket">{open}</span>
          <span className="j-meta"> {meta} </span>
        </>
      ) : (
        <span className="j-bracket">{open}</span>
      )}
      <div className="j-content">
        {entries.map(([k, v]) => (
          <div className="j-line" key={String(k)}>
            {!isArray && (
              <>
                <span className="j-key">"{esc(String(k))}"</span>
                <span>: </span>
              </>
            )}
            <JsonNode value={v} depth={depth + 1} />
          </div>
        ))}
      </div>
      <span className="j-bracket j-close">{close}</span>
    </div>
  );
}

interface JsonTreeProps {
  value: unknown;
}

export default function JsonTree({ value }: JsonTreeProps) {
  return (
    <div className="json">
      <JsonNode value={value} depth={0} />
    </div>
  );
}
