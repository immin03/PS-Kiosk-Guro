# Generate storeData.js from Excel TSV + rack-sections.json
import json, re, sys
from pathlib import Path
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

root = Path(r"C:\Users\immin\Projects\phama-kiosk\PS-Kiosk-Guro")
sections = json.loads((root / "rack-sections.json").read_text(encoding="utf-8"))
tsv = Path(r"C:\Users\immin\Projects\phama-kiosk\_rack_xlsx_dump\시트1.tsv")

# flatten labels
LABELS = {}
for group in ("A", "B", "C", "D"):
    LABELS.update(sections[group])
ALIASES = sections.get("aliases", {})

EMOJIS = {
    "콘드로이친": "🦴", "뼈건강": "🦴", "관절·근육 건강": "💪",
    "오메가3": "👁️", "기억력·인지력": "🧠", "눈건강": "👁️",
    "숙취해소": "🩺", "간건강": "🩺", "수면·스트레스": "😴",
    "이너뷰티": "✨", "여성건강": "🌸", "남성건강": "💪",
    "면역": "🛡️", "항산화": "🛡️", "홍삼": "🌿",
    "종합비타민": "💊", "비타민D": "💊", "비타민C": "💊",
    "단백질·아미노산": "⚡", "활력·에너지": "⚡", "어린이 건강": "👶🏻",
    "혈당·체중관리": "⚖️", "쉐이크·식사대용": "🥤", "디톡스": "🍃",
    "식품": "🍯", "식이섬유·효소": "🦠", "유산균": "🦠",
    "구강건강": "🦷", "구강청결": "🦷", "구강용품": "🪥",
    "모래·패드": "🐾", "펫 건강": "🐾", "펫 미용": "🛁",
    "펫 장난감": "🎾", "펫 위생용품": "🧼", "펫 사료·간식": "🦴",
    "마스크팩": "💧", "토너·세럼·미스트": "💧", "앰플·에센스": "💧",
    "크림": "💧", "아이케어": "👁️", "립 메이크업": "💄",
    "베이스 메이크업": "💄", "선케어": "☀️", "바디로션": "🧴",
    "프레시케어": "🧴", "뷰티 디바이스": "🔌", "샴푸": "💇",
    "트리트먼트·팩": "💇", "헤어케어·염색": "💇", "핸드크림·립밤": "🧴",
    "생리용품": "🧼", "위생용품": "🧼", "헤어 스타일링": "💇",
    "성인용품": "🔒", "여성 위생용품": "🧼", "제모용품·스크럽": "✨",
    "탈취·방향제": "🏡", "글로벌 뷰티": "🌍", "클렌징": "🫧",
    "핸드워시": "🧴", "바디케어": "🧴", "제이숲": "💇",
    "티에스": "💇", "꼬꼬도르": "🏡", "브이티 코스메틱": "💧",
    "어나더페이스": "💧", "믹순": "💧", "데싱디바": "💅",
    "풀리오": "🔌", "스파알": "🔌", "에이밍": "🪒", "맨즈케어": "🧔",
    "농협 · 한삼인": "🌿", "대상 웰라이프": "🥤", "네이처가든": "🌿",
    "익스트림": "⚡", "있나요 · 뉴핏": "⚖️", "어린이 간식": "🍪",
    "음료판매대": "🧃", "이벤트존": "🎁",
}


def zone_for(rack: str) -> str:
    if rack in ALIASES:
        rack = ALIASES[rack]
    if not rack:
        return "A"
    letter = rack[0]
    if letter == "A":
        try:
            n = int(re.sub(r"\D", "", rack) or "0")
            if n >= 31:
                return "E"
        except ValueError:
            pass
        return "A"
    if letter in "BCDE":
        return letter
    return "B"  # 음료 etc.


products = []
rack_counts = Counter()
brands = Counter()

for line in tsv.read_text(encoding="utf-8").splitlines()[1:]:
    parts = line.split("\t")
    if len(parts) < 3:
        continue
    # Excel: Rack / Barcode / SKU — barcode is reference-only, omitted from app data
    raw_rack, sku = parts[0].strip(), parts[2].strip()
    rack = ALIASES.get(raw_rack, raw_rack)
    m = re.match(r"^\[([^\]]+)\]\s*(.*)$", sku)
    if m:
        brand, name = m.group(1).strip(), m.group(2).strip()
    else:
        brand, name = "", sku
    if not name:
        continue
    label = LABELS.get(rack, raw_rack)
    zone = zone_for(rack)
    products.append({
        "name": name,
        "brand": brand,
        "cat": label,
        "rack": rack,
        "zone": zone,
        "en": "",
        "benefit": f"{label} · 섹션 {rack}",
        "spec": "",
        "sale": 0,
    })
    rack_counts[rack] += 1
    if brand:
        brands[brand] += 1

# categories
health, beauty, pet, brand_top = [], [], [], []

for rack, label in sections["A"].items():
    n = int(re.sub(r"\D", "", rack))
    entry = {
        "id": rack.lower(),
        "name": label,
        "emoji": EMOJIS.get(label, "📦"),
        "count": rack_counts.get(rack, 0),
        "zone": "E" if n >= 31 else "A",
        "racks": rack,
    }
    (pet if n >= 31 else health).append(entry)

for rack, label in sections["B"].items():
    brand_top.append({
        "id": rack.lower(),
        "name": label,
        "emoji": EMOJIS.get(label, "🏷️"),
        "count": rack_counts.get(rack, 0),
        "zone": "B",
        "racks": rack,
    })

for rack, label in sections["C"].items():
    beauty.append({
        "id": rack.lower(),
        "name": label,
        "emoji": EMOJIS.get(label, "🧴"),
        "count": rack_counts.get(rack, 0),
        "zone": "C",
        "racks": rack,
    })

for rack, label in sections["D"].items():
    beauty.append({
        "id": rack.lower(),
        "name": label,
        "emoji": EMOJIS.get(label, "✨"),
        "count": rack_counts.get(rack, 0),
        "zone": "D",
        "racks": rack,
    })

# Merge B into health list as "상단 브랜드" categories OR keep separate via TOP type brand
# App uses type health|beauty|pet|life — map brand_top to type "brand" and update App, OR append to health.
# Append B cats to HEALTH_CATS so they appear under 건강기능식품 top? Better add TOP type brand.
# Minimal App change: put B into HEALTH_CATS (zone B).

HEALTH_CATS = health + brand_top
BEAUTY_CATS = beauty
PET_CATS = pet

total = len(products)
health_n = sum(1 for p in products if p["zone"] in ("A", "B"))
beauty_n = sum(1 for p in products if p["zone"] in ("C", "D"))
pet_n = sum(1 for p in products if p["zone"] == "E")

TOP_CATS = [
    {"label": "건강기능식품", "sub": f"A·B 섹션 · {health_n}종", "emoji": "💊", "type": "health"},
    {"label": "화장품 · 뷰티", "sub": f"C·D 섹션 · {beauty_n}종", "emoji": "🧴", "type": "beauty"},
    {"label": "펫용품", "sub": f"A31–A36 · {pet_n}종", "emoji": "🐾", "type": "pet"},
    {"label": "생활 · 위생", "sub": "프레시케어 · 위생 · 탈취 등", "emoji": "🏡", "type": "life"},
]

ZONES_MAP = [
    {"id": "A", "label": "건강기능식품", "color": "#159A87", "desc": "A1~A30", "catType": "health"},
    {"id": "B", "label": "브랜드 · 간식 · 음료", "color": "#0E6E60", "desc": "B1~B10", "catType": "health"},
    {"id": "C", "label": "화장품 · 뷰티", "color": "#C98A8A", "desc": "C1~C25", "catType": "beauty"},
    {"id": "D", "label": "브랜드존", "color": "#B07070", "desc": "D1~D15", "catType": "beauty"},
    {"id": "E", "label": "펫", "color": "#D9A441", "desc": "A31~A36", "catType": "pet"},
]

ALL_BRANDS = sorted(brands.keys(), key=lambda b: (-brands[b], b))

out = root / "src" / "storeData.js"
# write JS
def dumps(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2)

js = f"""/* Auto-generated from 구로점 랙별 진열 SKU_260731.xlsx + latest floor map.
 * Do not edit by hand — regenerate via _gen_store_data.py
 */
export const SECTION_LABELS = {dumps(LABELS)};

export const HEALTH_CATS = {dumps(HEALTH_CATS)};

export const BEAUTY_CATS = {dumps(BEAUTY_CATS)};

export const PET_CATS = {dumps(PET_CATS)};

export const TOP_CATS = {dumps(TOP_CATS)};

export const ALL_BRANDS = {dumps(ALL_BRANDS)};

export const ZONES_MAP = {dumps(ZONES_MAP)};

export const ALL_PRODUCTS = {dumps(products)};
"""
out.write_text(js, encoding="utf-8")
print("wrote", out, "products", len(products), "brands", len(ALL_BRANDS))
print("health cats", len(HEALTH_CATS), "beauty", len(BEAUTY_CATS), "pet", len(PET_CATS))
