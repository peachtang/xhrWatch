import { useMemo, useState } from "react";
import CopyButton from "../components/CopyButton";
import JsonEditor from "../components/JsonEditor";

interface JsonFormatPageProps {
  raw: string;
  onRawChange: (raw: string) => void;
}

export default function JsonFormatPage({ raw, onRawChange }: JsonFormatPageProps) {
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo<unknown | null>(() => {
    const text = raw.trim();
    if (!text) {
      setError(null);
      return null;
    }
    try {
      const value = JSON.parse(text);
      setError(null);
      return value;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      return null;
    }
  }, [raw]);

  const formattedText = useMemo(() => {
    if (parsed === null) return "";
    return JSON.stringify(parsed, null, 2);
  }, [parsed]);

  return (
    <main className="json-format-page">
      <section className="json-format-input">
        <div className="json-format-header">
          <span>Input</span>
          <div className="json-format-actions">
            <button
              type="button"
              className="copy-btn"
              onClick={() => onRawChange("")}
              disabled={raw === ""}
            >
              clear
            </button>
            <span className="muted">paste unformatted JSON</span>
          </div>
        </div>
        <textarea
          className="json-format-textarea"
          placeholder={"{\"key\":\"value\"}"}
          value={raw}
          onChange={(e) => onRawChange(e.target.value)}
          spellCheck={false}
        />
        {error && <div className="json-format-error">Invalid JSON: {error}</div>}
      </section>
      <section className="json-format-output">
        <div className="json-format-header">
          <span>Formatted</span>
          <CopyButton text={formattedText} label="copy formatted" disabled={parsed === null} />
        </div>
        <div className="json-format-viewer">
          {parsed === null ? (
            <div className="placeholder">
              {raw.trim() ? "waiting for valid JSON..." : "paste JSON on the left"}
            </div>
          ) : (
            <JsonEditor value={parsed} />
          )}
        </div>
      </section>
    </main>
  );
}
