#!/usr/bin/env python3
"""상품 썸네일 — PS-OS 상품 원장 사진(catalog/product-gallery.json 대표 장) → public/thumbs/<바코드>.webp (2026-11-22 사용자 「상품 원장에 제품 있는 거로 전수 교체」).

키오스크는 매장 WebView 에서 오프라인으로도 돌아야 해서 사진을 받아오지 않고 저장소에 작게(160 × 160, 흰 바탕 가운데) 넣어 둔다.
POG 에 자리가 있는 상품(두 지점)만. 사진 원본은 PS-OS 저장소 또는 ~/.cache/ps-os-media(tools/media-pull.py).
scripts/sync-products.mjs 가 이 폴더에 있는 바코드에 img 를 붙인다.

  python3 scripts/sync-thumbs.py     (PS_OS_RACKS 로 정본 폴더를 바꿀 수 있다)
"""
import json, os, sys
from PIL import Image

DIR = os.path.dirname(os.environ.get('PS_OS_RACKS') or os.path.expanduser('~/Projects/ps-os/catalog/racks.json'))
ROOT = os.path.dirname(DIR)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'thumbs')
MEDIA = [ROOT, os.path.expanduser('~/.cache/ps-os-media')]
S = 160

gal = json.load(open(os.path.join(DIR, 'product-gallery.json'), encoding='utf-8'))['items']
pog = json.load(open(os.path.join(DIR, 'pog.json'), encoding='utf-8'))
need = {it['bc'] for st in pog['stores'] for r in st['racks'].values() for it in r.get('items', []) if it.get('bc') in gal}
os.makedirs(OUT, exist_ok=True)
made = miss = 0
for bc in sorted(need):
    dst = os.path.join(OUT, bc + '.webp')
    src = next((m + gal[bc][0]['u'] for m in MEDIA if os.path.exists(m + gal[bc][0]['u'])), None)
    if not src: miss += 1; continue
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src): made += 1; continue
    try:
        im = Image.open(src).convert('RGBA'); im.thumbnail((S - 8, S - 8), Image.LANCZOS)
        bg = Image.new('RGBA', (S, S), (255, 255, 255, 255)); bg.alpha_composite(im, ((S - im.width) // 2, (S - im.height) // 2))
        bg.convert('RGB').save(dst, 'WEBP', quality=78, method=6); made += 1
    except Exception as e:
        print('못 만듦', bc, e, file=sys.stderr); miss += 1
print(f'thumbs — {made}장 (원본 없음 {miss})')
