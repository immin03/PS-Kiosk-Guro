import { useRef } from "react";
import { Section, Rows, Chip, ChipRow, Btn, INK, SUB, MUTED, SOFT, MINT, PAD } from "./ui.jsx";
import FloorPlan from "./FloorPlan.jsx";
import { PromoSlides } from "./PromoBanner.jsx";

/* 프로모션 상세 — 배너를 누르면 열리는 세로 한 장(2026-11-27 사용자 여섯 구간).
 *   커버(대표 장표 · 영상) → 프로모션 내용 → 사은품 · 대표 상품 → 이런 점이 좋아요 → 위치 버튼 → 매장 위치 → 유의사항
 * 값은 전부 promo.page(scripts/promo-page.mjs 가 PS-OS 프칼 기록 page 칸 + 혜택 카탈로그로 만든 것).
 * 같은 값으로 웹 프로모션 페이지도 그릴 수 있게, 화면은 page 만 읽고 문구를 새로 적지 않는다.
 * page 가 없는 행사는 예전처럼 장표 넘겨 보기(PromoSlides). */
const FILES = import.meta.glob("./promo/**/*", { eager: true, query: "?url", import: "default" });
const fileUrl = (name) => (name ? FILES[`./promo/${name}`] : null);

const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const md = (d) => (d ? d.slice(5).replace("-", ".") : "");
const won = (n) => (n == null ? "" : Number(n).toLocaleString("en-US") + "원");

/* 상품 · 사은품 카드 — 옅은 회색 판 위에 사진을 가운데 담는다(흰 바탕 사진은 판에 녹게). 등수는 사진 왼쪽 위 */
function ItemCard({ img, emoji, tag, top, name, bottom }) {
  return (
    <div style={{ flex: "0 0 auto", width: 140 }}>
      <div style={{ position: "relative", width: 140, height: 140, borderRadius: 10, background: "#F5F6F7", display: "grid", placeItems: "center", overflow: "hidden" }}>
        {img
          ? <img src={img} alt="" draggable={false} style={{ width: "78%", height: "78%", objectFit: "contain", mixBlendMode: "multiply" }} />
          : <span aria-hidden="true" style={{ fontSize: 44, lineHeight: 1 }}>{emoji}</span>}
        {tag && <span style={{ position: "absolute", top: 8, left: 8, height: 24, padding: "0 8px", borderRadius: 999, background: MINT, color: "#FFFFFF",
          fontSize: 12, fontWeight: 600, lineHeight: "24px" }}>{tag}</span>}
      </div>
      {top && <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 500, color: MUTED, lineHeight: 1.4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{top}</p>}
      <p style={{ margin: top ? "2px 0 0" : "10px 0 0", fontSize: 14, fontWeight: 600, color: INK, lineHeight: 1.4, wordBreak: "keep-all",
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{name}</p>
      {bottom && <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 600, color: INK, fontVariantNumeric: "tabular-nums" }}>{bottom}</p>}
    </div>
  );
}

function Swipe({ children }) {
  return <div className="ui-swipe" style={{ display: "flex", gap: 12, overflowX: "auto", margin: `0 -${PAD}px`, padding: `0 ${PAD}px` }}>{children}</div>;
}

export default function PromoDetail({ promo, lang = "ko", onMap }) {
  const whereRef = useRef(null);
  const pg = promo && promo.page;
  if (!pg) return <div style={{ padding: "0 0 32px" }}><PromoSlides promo={promo} /></div>;
  const cover = promo.images && promo.images[0];
  const d = today();
  const live = promo.from && promo.from > d ? "예정" : promo.to && promo.to < d ? "종료" : "운영 중";
  const period = [md(promo.from), md(promo.to)].filter(Boolean).join(" – ");
  const where = pg.where;
  const toWhere = () => whereRef.current && whereRef.current.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div style={{ paddingBottom: 32 }}>
      {/* 커버 — 영상이 있으면 영상(장표를 포스터로), 없으면 대표 장표. 화면 폭 끝까지 */}
      {promo.detailVideo && fileUrl(promo.detailVideo)
        ? <video src={fileUrl(promo.detailVideo)} poster={fileUrl(cover) || undefined} autoPlay muted loop playsInline
            style={{ display: "block", width: "100%", height: "auto", background: "#F7F7F8" }} />
        : cover && <img src={fileUrl(cover)} alt={promo.title} draggable={false} style={{ display: "block", width: "100%", height: "auto" }} />}

      <div style={{ padding: `24px ${PAD}px 0` }}>
        {/* 프로모션 내용 */}
        <Section>
          <span style={{ display: "inline-block", height: 24, padding: "0 8px", borderRadius: 6, lineHeight: "24px", fontSize: 12, fontWeight: 600,
            color: live === "운영 중" ? MINT : SUB, background: live === "운영 중" ? "#E6F9F6" : SOFT }}>{live}</span>
          <h1 style={{ margin: "10px 0 0", fontSize: 20, fontWeight: 600, color: INK, lineHeight: 1.35, wordBreak: "keep-all" }}>
            {promo.title}
          </h1>
          {period && <p style={{ margin: "6px 0 0", fontSize: 14, fontWeight: 500, color: SUB, fontVariantNumeric: "tabular-nums" }}>{period}</p>}
          {promo.stores && promo.stores.length > 0 && <div style={{ marginTop: 12 }}><ChipRow>{promo.stores.map((s) => <Chip key={s}>{s}</Chip>)}</ChipRow></div>}
          {pg.offer.length > 0 && (
            <div style={{ marginTop: 18, borderTop: `1px solid ${SOFT}` }}>
              <Rows>{pg.offer.map((o) => (
                /* 이름 · 값 줄은 위쪽 맞춤 */
                <div key={o.k} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "13px 0" }}>
                  <span style={{ flex: "none", width: 56, fontSize: 14, fontWeight: 500, color: MUTED, lineHeight: 1.45 }}>{o.k}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: INK, lineHeight: 1.45, wordBreak: "keep-all" }}>{o.v}</span>
                </div>
              ))}</Rows>
              <div style={{ borderTop: `1px solid ${SOFT}` }} />
            </div>
          )}
        </Section>

        {/* 사은품 — 혜택 카탈로그에서 이 행사를 쓰는 것 */}
        {pg.gifts.length > 0 && (
          <Section title="사은품" count={pg.gifts.length}>
            <Swipe>{pg.gifts.map((g) => (
              <ItemCard key={g.id} img={fileUrl(g.img)} emoji="🎁" tag={g.label !== "사은품" ? g.label : null} top={g.maker} name={g.name} />
            ))}</Swipe>
          </Section>
        )}

        {/* 대표 상품 — 기록이 바코드로 고른 것, 사진은 상품 원장 */}
        {pg.products.length > 0 && (
          <Section title="대표 상품" count={pg.products.length}>
            <Swipe>{pg.products.map((p) => (
              <ItemCard key={p.bc} img={fileUrl(p.img)} emoji="💊" top={p.brand} name={p.name.replace(/\s*[[(].*$/, "")} bottom={won(p.price)} />
            ))}</Swipe>
          </Section>
        )}

        {/* 이런 점이 좋아요 — 그림 칸 + 제목 + 한 줄 */}
        {pg.points.length > 0 && (
          <Section title="이런 점이 좋아요">
            <Rows>{pg.points.map((p) => (
              <div key={p.t} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "12px 0" }}>
                <span aria-hidden="true" style={{ flex: "none", width: 44, height: 44, borderRadius: 10, background: "#F5F6F7", display: "grid", placeItems: "center", fontSize: 22, lineHeight: 1 }}>{p.icon}</span>
                <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: INK, lineHeight: 1.45 }}>{p.t}</p>
                  {p.d && <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 400, color: SUB, lineHeight: 1.5 }}>{p.d}</p>}
                </div>
              </div>
            ))}</Rows>
          </Section>
        )}

        {/* 위치 버튼 → 아래 매장 위치로 */}
        {where && <Section><Btn onClick={toWhere}>{where.t} 위치 보기</Btn></Section>}

        {/* 매장 위치 — 지점 지도에서 그 칸만 민트로, 길 안내는 지도 탭 */}
        {where && (
          <div ref={whereRef} style={{ scrollMarginTop: 64 }}>
            <Section title="매장 위치">
              <FloorPlan lang={lang} focus={{ mark: where.mark, zone: where.zone }} />
              <p style={{ margin: "14px 0 0", fontSize: 15, fontWeight: 600, color: INK, lineHeight: 1.45 }}>{where.t}</p>
              {where.d && <p style={{ margin: "2px 0 0", fontSize: 13, color: SUB, lineHeight: 1.5 }}>{where.d}</p>}
              {onMap && <div style={{ marginTop: 14 }}><Btn kind="secondary" onClick={onMap}>매장 지도에서 길 안내</Btn></div>}
            </Section>
          </div>
        )}

        {/* 유의사항 — 기본 문구 + 행사별 */}
        {pg.notes.length > 0 && (
          <Section title="유의사항" gap={0}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {pg.notes.map((n) => <li key={n} style={{ fontSize: 13, fontWeight: 400, color: SUB, lineHeight: 1.6, marginBottom: 4 }}>{n}</li>)}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}
