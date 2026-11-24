# 元旦青岛候选地点地图（单文件）

可离线打开的 Leaflet 旅行候选地点地图（WGS84）。默认尝试 OpenFreeMap 街道图，失败或手动切换时使用内置地理轮廓。

## 运行

用任意静态服务器打开仓库中的 `qingdao-travel-map.html`，或直接用浏览器打开该文件。

示例：

```bash
python3 -m http.server 43145 --bind 127.0.0.1
# 然后访问 http://127.0.0.1:43145/qingdao-travel-map.html
```

修好的可下载副本也在：`/opt/cursor/artifacts/qingdao-travel-map-mobile-fixed.html`。

## 移动端白条修复

在 `max-width: 720px` 下，`header` 已在文档流中占高，`#map` 相对 `#main` 再设 `top: var(--header-h)` 会造成标题与地图之间双倍留白。已改为 `#map { position: absolute; inset: 0; }`（桌面布局不变）。
