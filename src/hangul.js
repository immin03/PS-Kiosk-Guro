/* 화면 자판용 한글 조합(2026-11-22) — 글자 하나(자모)를 받아 지금 글에 붙이거나 앞 글자와 합친다.
 * typeKey(text, key) → 새 글. key 가 한글 자모가 아니면(영문 · 숫자 · 기호) 그냥 뒤에 붙는다.
 * backKey(text) → 마지막 글자를 한 칸 지운다(받침 → 중성 → 초성 순으로 풀림). */
const L = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ".split("");
const V = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ".split("");
const T = ["", ..."ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ".split("")];

/* 겹모음 · 겹받침 */
const VV = { "ㅗㅏ": "ㅘ", "ㅗㅐ": "ㅙ", "ㅗㅣ": "ㅚ", "ㅜㅓ": "ㅝ", "ㅜㅔ": "ㅞ", "ㅜㅣ": "ㅟ", "ㅡㅣ": "ㅢ" };
const TT = { "ㄱㅅ": "ㄳ", "ㄴㅈ": "ㄵ", "ㄴㅎ": "ㄶ", "ㄹㄱ": "ㄺ", "ㄹㅁ": "ㄻ", "ㄹㅂ": "ㄼ", "ㄹㅅ": "ㄽ", "ㄹㅌ": "ㄾ", "ㄹㅍ": "ㄿ", "ㄹㅎ": "ㅀ", "ㅂㅅ": "ㅄ" };
const TT_SPLIT = Object.fromEntries(Object.entries(TT).map(([k, v]) => [v, [k[0], k[1]]]));
const VV_SPLIT = Object.fromEntries(Object.entries(VV).map(([k, v]) => [v, [k[0], k[1]]]));

const isJa = (c) => /[ㄱ-ㅎ]/.test(c);
const isMo = (c) => /[ㅏ-ㅣ]/.test(c);
const isSyl = (c) => !!c && c >= "가" && c <= "힣";
const split = (c) => { const n = c.charCodeAt(0) - 0xAC00; return { l: L[Math.floor(n / 588)], v: V[Math.floor((n % 588) / 28)], t: T[n % 28] }; };
const make = (l, v, t = "") => String.fromCharCode(0xAC00 + (L.indexOf(l) * 21 + V.indexOf(v)) * 28 + T.indexOf(t));
const canL = (c) => L.includes(c);
const canT = (c) => T.includes(c) && c !== "";

export function typeKey(text, key) {
  if (!key) return text;
  if (!isJa(key) && !isMo(key)) return text + key;
  const last = text.slice(-1), head = text.slice(0, -1);
  if (isMo(key)) {
    if (isSyl(last)) {
      const { l, v, t } = split(last);
      if (!t) { const c = VV[v + key]; return c ? head + make(l, c) : text + key; }
      /* 받침이 다음 글자의 초성으로 넘어간다(겹받침은 뒤쪽만) */
      if (TT_SPLIT[t]) { const [a, b] = TT_SPLIT[t]; return head + make(l, v, a) + make(b, key); }
      return head + make(l, v) + make(t, key);
    }
    if (isJa(last) && canL(last)) return head + ("ㅏ" <= key ? make(last, key) : last + key);
    return text + key;
  }
  /* 자음 */
  if (isSyl(last)) {
    const { l, v, t } = split(last);
    if (!t) return canT(key) ? head + make(l, v, key) : text + key;
    const c = TT[t + key];
    return c ? head + make(l, v, c) : text + key;
  }
  return text + key;
}

export function backKey(text) {
  if (!text) return text;
  const last = text.slice(-1), head = text.slice(0, -1);
  if (isSyl(last)) {
    const { l, v, t } = split(last);
    if (t) { const sp = TT_SPLIT[t]; return head + make(l, v, sp ? sp[0] : ""); }
    const sp = VV_SPLIT[v];
    return head + (sp ? make(l, sp[0]) : l);
  }
  return head;
}
