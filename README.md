# 元旦青岛候选地点地图（Vue3）

Vue 3 + Vite + **Element Plus** + Leaflet / MapLibre。  
**改地点只动 JSON**；地图绘制在 `src/lib/map-engine.js`；侧栏/按钮用 Element Plus（PC 右侧栏 + H5 底部抽屉）。

线上预览（若已部署）：https://travel-map-mauve-iota.vercel.app

---

## 你最常改的东西

| 想做什么 | 改哪个文件 |
|----------|------------|
| 增删改地点、备注、坐标 | `src/config/places.json` |
| 每日行程节点 / 路段 / 排除 | `src/config/trip-plan.json` |
| 视图范围 / 区名 / 行程说明 | `src/config/map-meta.json` |
| 两个点叠在一起要错开 | `src/config/marker-offsets.json` |
| 离线路网（几乎别动） | `src/config/outline-fallback.json` |

字段含义见：**[src/config/README.md](src/config/README.md)**（JSON 本身不能写注释，说明书写在这里）。

改完建议：

```bash
npm run validate
npm run dev
```

---

## 项目结构（读代码从这里进）

```
src/
  config/              # 四分 JSON 配置 ← 改数据从这里
  components/
    PanelBody.vue      # 侧栏内容（Element Plus 按钮/搜索/筛选）
    SidePanel.vue      # PC 右侧栏 + H5 底部抽屉壳
    BasemapSwitch.vue  # 底图切换
    …
  lib/map-engine.js    # 地图点、标签、底图状态机
  lib/map-bridge.js    # Vue ↔ 引擎 API 桥
  composables/         # useIsMobile 等（720px 断点）
  types/place.ts
  assets/styles/
  App.vue
  main.ts              # 注册 Element Plus（中文）
```

`#list` / `#detail` / `#doc-guide` 仍由引擎灌 HTML，**不要删这些 id**。筛选/搜索/视图按钮已改由 Vue 调 `getMapApi()`。

---

## 开发 / 构建

```bash
npm install
npm run dev            # http://127.0.0.1:43146
npm run build          # → dist/index.html（JS/CSS 已内联成单文件）
npm run preview        # http://127.0.0.1:43147
npm run validate           # places + trip-plan
npm run validate:places
npm run validate:trip-plan
```

也可直接用浏览器打开 `dist/index.html`（街道图需联网；内置轮廓可离线）。

右上角「计划」开关默认关闭（完整地点浏览）；开启后按 `trip-plan.json` 的当日节点组织菜单并画示意路线。行程内容由策划写入 JSON，勿把骨架空行程当成最终计划。

---

## 底图说明

- 默认尝试 **OpenFreeMap** 街道图（公开无密钥）。
- 失败或手动切换 → **内置轮廓**（`outline-fallback.json`）。
- **不**请求 OSM.org / OSM.de / OpenTopoMap 官方瓦片。

坐标均为 **WGS84**。本页不作预订。
