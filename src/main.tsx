import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Provider } from "react-redux";

import App from "./client/App";
import { createClientState } from "./client/state/createClientState";
import "./client/styles/style.css";

const clientState = createClientState();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={clientState}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/:roomName" element={<App />} />
          <Route path="/:roomName/:playerName" element={<App />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
