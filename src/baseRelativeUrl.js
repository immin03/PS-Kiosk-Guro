/* 배포 위치에 상관없이 public 아래 파일 주소를 만듭니다.
 * Netlify 에서는 「/data」, 한 서버에 여러 앱을 올리는 구성(예: /guro/)에서는
 * 「/guro/data」 가 됩니다. 보이미 전달본(2026-09-18) 과 같습니다. */
export function resolveBaseRelativeUrl(baseUrl, relativePath) {
  const base = String(baseUrl || "./").replace(/\/+$/, "");
  const child = String(relativePath || "").replace(/^\/+/, "");
  return `${base}/${child}`;
}
