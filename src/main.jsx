import React from "react";
import { STORE_CONFIG } from "./store.js";
document.title = "파마스퀘어 익스프레스 " + STORE_CONFIG.name;
import ReactDOM from "react-dom/client";
import KioskApp from "./App.jsx";
import EventsPage from "./EventsPage.jsx";
/* ?view=events — 진행 중 이벤트 목록 페이지(키오스크 화면 대신) */
const VIEW = new URLSearchParams(window.location.search).get("view");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {VIEW === "events" ? <EventsPage /> : <KioskApp />}
  </React.StrictMode>
);
