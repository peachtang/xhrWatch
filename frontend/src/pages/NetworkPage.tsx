import { useMemo, useState } from "react";
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

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedId) || null,
    [events, selectedId],
  );

  return (
    <>
      <header className="toolbar">
        <span className="title">⚡ XHR Watch</span>
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
        <span id="count" className="muted">
          {events.length} events
        </span>
        <span id="status" className={`status status-${status}`}>
          {status}
        </span>
      </header>
      <main>
        <EventList
          events={displayEvents}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <EventDetail
          ev={selectedEvent}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </main>
    </>
  );
}
