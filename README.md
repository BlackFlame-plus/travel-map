# 元旦青岛候选地点地图（Vue3）

Vue 3 + Vite + Leaflet / MapLibre。  
**改地点只动 JSON**；地图交互逻辑在 `src/lib/map-engine.js`。

线上预览（若已部署）：https://travel-map-mauve-iota.vercel.app

---

## 你最常改的东西

| 想做什么 | 改哪个文件 |
|----------|------------|
| 增删改地点、备注、坐标 | `src/config/places.json` |
| 视图范围 / 区名 / 行程说明 | `src/config/map-meta.json` |
| 两个点叠在一起要错开 | `src/config/marker-offsets.json` |
| 离线路网（几乎别动） | `src/config/outline-fallback.json` |

字段含义见：**[src/config/README.md](src/config/README.md)**（JSON 本身不能写注释，说明书写在这里）。

改完建议：

```bash
npm run validate:places
npm run dev
```

---

## 项目结构（读代码从这里进）

```
src/
  config/           # 四分 JSON 配置 ← 改数据从这里
  components/       # Vue 壳子（顶栏、地图容器、侧栏、底图按钮）
  lib/map-engine.js # 真正的地图逻辑（点、筛选、底图切换）
  types/place.ts    # 地点字段的 TypeScript 说明
  assets/styles/    # 全局 CSS 布局
  App.vue           # 页面骨架：把组件拼在一起
  main.ts           # 入口
```

组件里的 `#panel`、`#search`、`data-cat` 等 **id / data-\*** 被引擎按名字绑定，不要随便改名。

---

## 开发 / 构建

```bash
npm install
npm run dev            # http://127.0.0.1:43146
npm run build          # → dist/index.html（JS/CSS 已内联成单文件）
npm run preview        # http://127.0.0.1:43147
npm run validate:places
```

也可直接用浏览器打开 `dist/index.html`（街道图需联网；内置轮廓可离线）。

---

## 底图说明

- 默认尝试 **OpenFreeMap** 街道图（公开无密钥）。
- 失败或手动切换 → **内置轮廓**（`outline-fallback.json`）。
- **不**请求 OSM.org / OSM.de / OpenTopoMap 官方瓦片。

坐标均为 **WGS84**。本页不作预订。
