# Qingdao map parity checklist

Baseline: legacy `qingdao-travel-map.html` (mobile gap fix included).

## Layout
- [ ] 360 / 390 / 430: header bottom touches map top (gap ≈ 0), no horizontal overflow
- [ ] Desktop ~1280: map left + panel right, subtitle visible

## Map
- [ ] Pinch/drag pan and +/- zoom work
- [ ] Basemap: 街道图 (OpenFreeMap) ↔ 内置轮廓; user click wins race
- [ ] No requests to tile.openstreetmap.org / osm.de / opentopomap
- [ ] Offline outline shows land/water/roads when OFM unavailable or selected

## Places
- [ ] 94 list items from config
- [ ] Category chips filter (scenic/food/bar/culture)
- [ ] Search filters list + map
- [ ] Names / area labels toggles
- [ ] View buttons: 游玩区/市区/全域/老城/东部/太清
- [ ] Click marker or list opens detail; sources/links OK
- [ ] Nested candidates still render when present

## Panel
- [ ] Mobile grip expands/collapses「地点与说明」
- [ ] Doc guide block renders from map-meta
