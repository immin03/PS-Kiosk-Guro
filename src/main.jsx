import React from "react";
import { STORE_CONFIG } from "./store.js";
document.title = "파마스퀘어 익스프레스 " + STORE_CONFIG.name;
import ReactDOM from "react-dom/client";
import KioskApp from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <KioskApp />
  </React.StrictMode>
);
