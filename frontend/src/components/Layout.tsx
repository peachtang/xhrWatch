import { Link, useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";

const TABS = [
  { key: "network", label: "Network", path: "/" },
  { key: "console", label: "Console", path: "/console" },
  { key: "jsonformat", label: "JSON Format", path: "/jsonformat" },
  { key: "guide", label: "Guide", path: "/guide" },
] as const;

export default function Layout() {
  const location = useLocation();

  return (
    <>
      <div className="devtools-bar">
        <div className="brand">
          <img src="/favicon.svg" alt="" width={14} height={14} />
          <span className="brand-name">XHR Watch</span>
        </div>
        <nav className="nav-tabs">
          {TABS.map((tab) => {
            const active =
              tab.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(tab.path);
            return (
              <Link
                key={tab.key}
                to={tab.path}
                className={`nav-tab ${active ? "active" : ""}`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <Outlet />
    </>
  );
}
