import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useXhrEvents } from "../useXhrEvents";
import EventDetail from "../components/EventDetail";
import EventList from "../components/EventList";

type TabKey = "params" | "req" | "res";

export default function NetworkPage() {
  const {
    events,
    displayEvents,
    selectedId,
    setSelectedId,
    filterText,
    setFilterText,
    paused,
    setPaused,
    status,
    clear,
  } = useXhrEvents();

  const [activeTab, setActiveTab] = useState<TabKey>("params");
  // DevTools 风格可拖拽分栏：detail 面板宽度（px），默认与列表平分
  const [detailWidth, setDetailWidth] = useState<number>(() =>
    Math.round(window.innerWidth / 2),
  );
  const dragging = useRef(false);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedId) || null,
    [events, selectedId],
  );

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const max = window.innerWidth - 320; // 列表最小宽度
      const w = Math.min(Math.max(e.clientX, 320), max);
      setDetailWidth(window.innerWidth - w);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div className="page">
      <header className="toolbar panel-toolbar">
        <input
          id="filter"
          type="text"
          placeholder="filter URL / fn / method..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
        <label className="pause">
          <input
            type="checkbox"
            checked={paused}
            onChange={(e) => setPaused(e.target.checked)}
          />{" "}
          pause
        </label>
        <button id="clear" onClick={clear}>
          Clear
        </button>
      </header>
      <main className="split">
        <EventList
          events={displayEvents}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <div className="divider" onMouseDown={onDragStart} />
        <section className="detail-pane" style={{ width: detailWidth }}>
          <EventDetail
            ev={selectedEvent}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </section>
      </main>
      <footer className="statusbar">
        <span className="sb-count">
          {displayEvents.length}/{events.length} events
          {paused ? " · paused" : ""}
        </span>
        <span className="sb-spacer" />
        <span id="status" className={`status status-${status}`}>
          {status === "connected" ? "● connected" : "○ disconnected"}
        </span>
      </footer>
    </div>
  );
}
