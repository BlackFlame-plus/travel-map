# 元旦青岛候选地点地图（Vue3）

Vue 3 + Vite + Leaflet / MapLibre。地点与展示属性在 JSON 配置里改；`npm run build` 产出**单文件** `dist/index.html`。

## 配置（四分）

| 文件 | 用途 |
|------|------|
| `src/config/places.json` | 地点列表（日常主要改这个） |
| `src/config/map-meta.json` | 视图、区域名、高亮线、文档说明 |
| `src/config/marker-offsets.json` | 重合点视觉偏移 |
| `src/config/outline-fallback.json` | 内置离线轮廓几何（很少改） |

改完地点后建议：

```bash
npm run validate:places
```

## 开发

```bash
npm install
npm run dev          # http://127.0.0.1:43146
```

## 单文件构建

```bash
npm run build        # → dist/index.html（JS/CSS 已内联）
npm run preview      # http://127.0.0.1:43147
```

也可用任意静态服务器打开 `dist/index.html`，或直接用浏览器打开该文件（OpenFreeMap 需联网；内置轮廓可离线）。

## 结构

- `src/components/*`：页头、地图壳、底图切换、侧栏等
- `src/lib/map-engine.js`：地图行为（从原单文件迁入，保持筛选/底图竞态等逻辑）
- `legacy/qingdao-travel-map.html`：迁移前单文件基线

## 底图说明

默认尝试 OpenFreeMap 街道图；可切换「内置轮廓」。不请求 OSM.org / OSM.de / OpenTopoMap 官方瓦片。
