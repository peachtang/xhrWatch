import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import JsonFormatPage from "./pages/JsonFormatPage";
import NetworkPage from "./pages/NetworkPage";
import ConsolePage, { type Level } from "./pages/ConsolePage";
import GuidePage from "./pages/GuidePage";

export default function App() {
  const [jsonRaw, setJsonRaw] = useState("");
  const [consoleFilterText, setConsoleFilterText] = useState("");
  const [consoleUseRegex, setConsoleUseRegex] = useState(false);
  const [consoleOffLevels, setConsoleOffLevels] = useState<Set<Level>>(new Set());

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<NetworkPage />} />
        <Route
          path="/console"
          element={
            <ConsolePage
              filterText={consoleFilterText}
              onFilterTextChange={setConsoleFilterText}
              useRegex={consoleUseRegex}
              onUseRegexChange={setConsoleUseRegex}
              offLevels={consoleOffLevels}
              onOffLevelsChange={setConsoleOffLevels}
            />
          }
        />
        <Route
          path="/jsonformat"
          element={<JsonFormatPage raw={jsonRaw} onRawChange={setJsonRaw} />}
        />
        <Route path="/guide" element={<GuidePage />} />
      </Route>
    </Routes>
  );
}
