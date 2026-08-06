import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import JsonFormatPage from "./pages/JsonFormatPage";
import NetworkPage from "./pages/NetworkPage";

export default function App() {
  const [jsonRaw, setJsonRaw] = useState("");

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<NetworkPage />} />
        <Route
          path="/jsonformat"
          element={<JsonFormatPage raw={jsonRaw} onRawChange={setJsonRaw} />}
        />
      </Route>
    </Routes>
  );
}
