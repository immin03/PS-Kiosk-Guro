import React from "react";
import { STORE_CONFIG } from "./store.js";
document.title = "파마스퀘어 익스프레스 " + STORE_CONFIG.name;
import ReactDOM from "react-dom/client";
import KioskApp from "./App.jsx";
import Shell75 from "./Shell75.jsx";
/* 75" 입구 DID — 아래쪽 50" 만한 판에 키오스크, 위는 행사 장표(Shell75). 판 안쪽(&inner=1)은 그냥 키오스크.
   ?did=75(PS-OS 미리보기) · ?did=DD-DID-ENT-75T-…(매장 기기 링크), 주소에서 빠져도 이 탭에 기억한 기기 코드(ps_did)로 */
const QS = new URLSearchParams(window.location.search);
let DID = QS.get("did") || "";
try { if (!DID) DID = sessionStorage.getItem("ps_did") || ""; } catch (e) {}
const SHELL75 = !QS.has("inner") && /(^|\D)75(\D|$)/.test(DID);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {SHELL75 ? <Shell75 /> : <KioskApp />}
  </React.StrictMode>
);
