import type { XhrEvent } from "../types";
import { esc } from "../utils";
import CopyButton from "./CopyButton";
import JsonEditor from "./JsonEditor";

const TABS = [
  { key: "params", label: "Params" },
  { key: "req", label: "Request" },
  { key: "res", label: "Response" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

interface EventDetailProps {
  ev: XhrEvent | null;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

function renderParams(ev: XhrEvent) {
  let params: [string, string][] = [];
  try {
    const u = new URL(ev.url);
    params = Array.from(u.searchParams.entries());
  } catch {
    return <div className="body-raw">invalid URL: {esc(ev.url)}</div>;
  }

  const statusClass = `status status-${Math.floor(ev.status / 100)}xx`;
  return (
    <>
      <table className="params-table">
        <tbody>
          <tr>
            <th>请求网址</th>
            <td>{esc(ev.url)}</td>
          </tr>
          <tr>
            <th>请求方式</th>
            <td>
              <span className={`method method-${ev.method}`}>
                {esc(ev.method)}
              </span>
            </td>
          </tr>
          <tr>
            <th>状态码</th>
            <td>
              <span className={statusClass}>{ev.status}</span>
            </td>
          </tr>
        </tbody>
      </table>
      {params.length === 0 ? (
        <div className="placeholder" style={{ marginTop: 12 }}>
          no query params
        </div>
      ) : (
        <>
          <div
            style={{ margin: "12px 0 6px", color: "#cccccc", fontWeight: 600 }}
          >
            查询参数
          </div>
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
        </>
      )}
    </>
  );
}

function renderBody(body: string | null | undefined, kind: string) {
  if (!body) {
    return <div className="placeholder">empty {kind} body</div>;
  }
  const truncated = body.indexOf("[truncated") !== -1;
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
      {parsed !== null ? (
        <JsonEditor value={parsed} />
      ) : (
        <pre className="body-raw">{esc(body)}</pre>
      )}
      {truncated && (
        <div className="truncated-notice">⚠ body truncated at 50KB</div>
      )}
    </div>
  );
}

export default function EventDetail({
  ev,
  activeTab,
  onTabChange,
}: EventDetailProps) {
  return (
    <aside className="detail">
      <nav className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            data-tab={tab.key}
            className={activeTab === tab.key ? "active" : ""}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div id="detail-body" className="detail-body">
        {ev ? (
          <>
            {activeTab === "params" && renderParams(ev)}
            {activeTab === "req" && renderBody(ev.reqBody, "request")}
            {activeTab === "res" && renderBody(ev.resBody, "response")}
          </>
        ) : (
          <div className="placeholder">click a row to inspect</div>
        )}
      </div>
    </aside>
  );
}
