import { useState } from "react";
import type { XhrEvent } from "../types";
import { esc } from "../utils";
import CopyButton from "./CopyButton";
import JsonEditor from "./JsonEditor";

const TABS = [
  { key: "params", label: "Params" },
  { key: "req", label: "Request" },
  { key: "res", label: "Response" },
] as const;

function copyText(text: string) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(ta);
  }
  return Promise.resolve();
}

type TabKey = (typeof TABS)[number]["key"];

interface EventDetailProps {
  ev: XhrEvent | null;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

function renderParams(ev: XhrEvent, onCopy: (text: string) => void) {
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
            <td onDoubleClick={() => onCopy(ev.url)} title="双击复制">
              {esc(ev.url)}
            </td>
          </tr>
          <tr>
            <th>请求方式</th>
            <td onDoubleClick={() => onCopy(ev.method)} title="双击复制">
              <span className={`method method-${ev.method}`}>
                {esc(ev.method)}
              </span>
            </td>
          </tr>
          <tr>
            <th>状态码</th>
            <td
              onDoubleClick={() => onCopy(String(ev.status))}
              title="双击复制"
            >
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
                  <td onDoubleClick={() => onCopy(v)} title="双击复制">
                    {esc(v)}
                  </td>
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
  const [notice, setNotice] = useState<string | null>(null);
  let noticeTimer = 0;

  const handleCopy = (text: string) => {
    copyText(text)
      .then(() => {
        if (noticeTimer) window.clearTimeout(noticeTimer);
        setNotice(`已复制：${text}`);
        noticeTimer = window.setTimeout(() => setNotice(null), 2000);
      })
      .catch(() => {
        if (noticeTimer) window.clearTimeout(noticeTimer);
        setNotice("复制失败");
        noticeTimer = window.setTimeout(() => setNotice(null), 2000);
      });
  };

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
        {notice && <div className="copy-notice">{notice}</div>}
        {ev ? (
          <>
            {activeTab === "params" && renderParams(ev, handleCopy)}
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
