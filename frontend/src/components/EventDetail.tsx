import type { XhrEvent } from '../types';
import { esc } from '../utils';
import CopyButton from './CopyButton';
import JsonEditor from './JsonEditor';

const TABS = [
  { key: 'params', label: 'Params' },
  { key: 'req', label: 'Request' },
  { key: 'res', label: 'Response' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

interface EventDetailProps {
  ev: XhrEvent | null;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

function renderParams(url: string) {
  let params: [string, string][] = [];
  try {
    const u = new URL(url);
    params = Array.from(u.searchParams.entries());
  } catch {
    return <div className="body-raw">invalid URL: {esc(url)}</div>;
  }
  if (params.length === 0) {
    return <div className="placeholder">no query params</div>;
  }
  return (
    <table className="params-table">
      <tbody>
        {params.map(([k, v]) => (
          <tr key={k + v}>
            <th>{esc(k)}</th>
            <td>{esc(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderBody(body: string | null | undefined, kind: string) {
  if (!body) {
    return <div className="placeholder">empty {kind} body</div>;
  }
  const truncated = body.indexOf('[truncated') !== -1;
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    // keep parsed null
  }
  return (
    <div className="json-wrap">
      <div className="json-toolbar">
        <CopyButton text={body} label={`copy ${kind} body`} />
      </div>
      {parsed !== null ? <JsonEditor value={parsed} /> : <pre className="body-raw">{esc(body)}</pre>}
      {truncated && (
        <div className="truncated-notice">⚠ body truncated at 50KB</div>
      )}
    </div>
  );
}

export default function EventDetail({ ev, activeTab, onTabChange }: EventDetailProps) {
  return (
    <aside className="detail">
      <nav className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            data-tab={tab.key}
            className={activeTab === tab.key ? 'active' : ''}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div id="detail-body" className="detail-body">
        {ev ? (
          <>
            {activeTab === 'params' && renderParams(ev.url)}
            {activeTab === 'req' && renderBody(ev.reqBody, 'request')}
            {activeTab === 'res' && renderBody(ev.resBody, 'response')}
          </>
        ) : (
          <div className="placeholder">click a row to inspect</div>
        )}
      </div>
    </aside>
  );
}
