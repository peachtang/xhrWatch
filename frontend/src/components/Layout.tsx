import { Link, useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";

const TABS = [
  { key: "network", label: "Network", path: "/" },
  { key: "console", label: "Console", path: "/console" },
  { key: "jsonformat", label: "JSON Format", path: "/jsonformat" },
] as const;

export default function Layout() {
  const location = useLocation();

  return (
    <>
      <div className="toolbar">
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
        <span className="muted">{location.pathname}</span>
      </div>
      <Outlet />
    </>
  );
}
