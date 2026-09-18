/* 상품 조각을 필요할 때 불러옵니다.
 *
 * 보이미(Boim.e) 성능 개선 전달본(2026-09-18) 의 catalogClient.js 를 그대로
 * 옮겨 왔습니다.
 *
 * - manifest.json 은 매번 새로 받습니다(no-cache). 상품이 바뀌면 여기 적힌
 *   묶음 이름이 바뀝니다.
 * - 묶음 안의 조각은 이름에 내용 해시가 붙어 있어 한 번 받으면 캐시를 씁니다.
 * - 같은 조각을 동시에 두 번 부르면 요청은 한 번만 나갑니다. 실패하면 기억을
 *   지워 다음에 다시 시도합니다.
 */
import { resolveBaseRelativeUrl } from "../baseRelativeUrl.js";

const trim = (value) => String(value || "").replace(/^\/+|\/+$/g, "");
const joinUrl = (base, child) => `${String(base || ".").replace(/\/+$/, "")}/${trim(child)}`;

async function defaultFetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`catalog request failed: ${url} (${response.status})`);
  return response.json();
}

export function createCatalogClient({ dataRoot = "./data", fetchJson = defaultFetchJson } = {}) {
  let manifestPromise;
  const resources = new Map();
  const resourceRequests = new Map();

  const loadManifest = () => {
    if (!manifestPromise) {
      const request = Promise.resolve()
        .then(() => fetchJson(joinUrl(dataRoot, "manifest.json"), { cache: "no-cache" }))
        .catch((error) => {
          if (manifestPromise === request) manifestPromise = undefined;
          throw error;
        });
      manifestPromise = request;
    }
    return manifestPromise;
  };

  const loadResource = (resourceKey, getResourcePath) => {
    if (!resourceRequests.has(resourceKey)) {
      const request = loadManifest().then((manifest) => {
        const resourcePath = getResourcePath(manifest);
        const key = `${manifest.currentVersion}:${resourcePath}`;
        if (!resources.has(key)) {
          const resourceRequest = Promise.resolve()
            .then(() => fetchJson(joinUrl(joinUrl(dataRoot, manifest.baseUrl), resourcePath), { cache: "force-cache" }))
            .catch((error) => {
              if (resources.get(key) === resourceRequest) resources.delete(key);
              throw error;
            });
          resources.set(key, resourceRequest);
        }
        return resources.get(key);
      }).catch((error) => {
        if (resourceRequests.get(resourceKey) === request) resourceRequests.delete(resourceKey);
        throw error;
      });
      resourceRequests.set(resourceKey, request);
    }
    return resourceRequests.get(resourceKey);
  };

  return {
    loadManifest,
    loadBrands: () => loadResource("brands", (m) => m.resources.brands),
    loadSearchIndex: () => loadResource("search-index", (m) => m.resources.searchIndex),
    loadCategory: (fileId) => {
      const id = String(fileId).toLowerCase();
      return loadResource(`category:${id}`, (m) => `${m.resources.categoryRoot}${id}.json`);
    },
    clear() {
      manifestPromise = undefined;
      resourceRequests.clear();
      resources.clear();
    },
  };
}

const base = typeof import.meta.env !== "undefined" ? import.meta.env.BASE_URL : "./";
export const catalogClient = createCatalogClient({ dataRoot: resolveBaseRelativeUrl(base, "data") });
