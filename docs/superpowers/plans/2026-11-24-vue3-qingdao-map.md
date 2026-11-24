# 青岛候选地图 Vue3 化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有单文件 `qingdao-travel-map.html` 迁成 Vue3 工程，地点与展示属性进 JSON 配置，交互与视觉效果保持不变，并推到你的 GitHub 仓库。

**Architecture:** 先「抽配置、行为不动」再「Vite + Vue3 包壳」，地图命令式逻辑集中在一个 `TravelMap` 组件里，侧栏/列表/详情用 Vue 状态驱动；离线轮廓大文件单独当静态资源，不放进日常改的地点 JSON。

**Tech Stack:** Vue 3 + Vite + TypeScript（轻量）+ Leaflet + maplibre-gl + `@maplibre/maplibre-gl-leaflet`；配置为 JSON（可后续加 Zod/自定义校验）。

## Global Constraints

- 功能对等：94 地点、类型筛选、搜索、常显名/区域名、两底图切换与竞态、底部面板、视图按钮、详情与文档说明。
- 禁止请求已被拒绝的 OSM.org / OSM.de / OpenTopoMap；不代理绕过。
- 移动端标题与地图无双倍留白（保留已修的 `#map { inset: 0 }` 布局）。
- 日常可改的是地点配置；`fallback` 离线几何不塞进同一份「改地点 JSON」。
- 不改行程文案含义；坐标仍为 WGS84。
- 本阶段不公开发布/部署到 Vercel 等；以 GitHub 私有/你指定仓库为准。

---

## 文件与职责（目标结构）

```
qingdao-travel-map/          # 或仓库根（若整仓就是本项目）
  package.json
  vite.config.ts
  index.html
  public/
    outline-fallback.json    # 从 MAP_DATA.fallback 拆出（~2.8MB）
  src/
    main.ts
    App.vue
    assets/styles/map.css    # 现有自定义 CSS（含移动端修复）
    config/
      places.json            # 日常改：地点列表
      map-meta.json          # views / areaLabels / highlights / docGuide / 文案日期
      categories.json        # 类别色与标签（可选，也可进 map-meta）
      marker-offsets.json    # 原 FIXED_OFFSET
    types/place.ts           # Place / Candidate / Precision 类型
    lib/
      basemap.ts             # OFM ↔ outline 状态机（从现脚本迁）
      outline.ts             # 内置轮廓渲染
      markers.ts             # 点、偏移、标签
    components/
      AppHeader.vue
      TravelMap.vue          # 唯一挂 Leaflet 的容器
      BasemapSwitch.vue
      SidePanel.vue
      FilterToolbar.vue
      PlaceList.vue
      PlaceDetail.vue
      DocGuide.vue
      TileBanner.vue
  docs/...                   # 本计划可保留
```

**配置边界**

| 文件 | 改什么 | 不改什么 |
|------|--------|----------|
| `places.json` | 地点、坐标、类别、精度、备注、候选分店 | 路网/海岸几何 |
| `map-meta.json` | 视图 bounds、区域名、高亮折线、文档说明块 | Leaflet 行为 |
| `outline-fallback.json` | 几乎不动；仅重建离线底图时更新 | 地点业务字段 |

---

## Task 1: 冻结现状验收清单

**Goal:** 迁移前后有同一张「对等检查表」，避免漏竞态或移动端回归。

**Files:**
- Create: `docs/superpowers/plans/qingdao-map-parity-checklist.md`（或本节附录勾选）

- [ ] 列出验收项：360/390/430 gap=0、桌面侧栏、缩放拖动、OFM/轮廓切换不回跳、筛选四类、搜索、地点名开关、面板展开、94 条列表、详情字段。
- [ ] 对当前 `qingdao-travel-map.html` 跑一遍并记「基线通过」。
- [ ] Commit：`docs: add Vue migration parity checklist`

---

## Task 2: 抽出 JSON，单文件先改读配置（不引入 Vue）

**Goal:** 证明「只改 places.json 就能改地点」，风险最低。

**Files:**
- Create: `data/places.json`, `data/map-meta.json`, `data/marker-offsets.json`, `data/outline-fallback.json`
- Modify: 临时脚本或改 HTML 为 `fetch` 上述文件（可用极小静态服）

- [ ] 从 `window.MAP_DATA` 导出：`places` → `places.json`；其余元数据 → `map-meta.json`；`fallback` → `outline-fallback.json`；脚本内 `FIXED_OFFSET` → `marker-offsets.json`。
- [ ] 写 `scripts/extract-map-data.mjs`（一次性），保证条数仍为 94、sha/字段抽查一致。
- [ ] 改应用逻辑为异步加载 JSON 后再 `L.map`；本地 `python3 -m http.server` 验证与基线一致。
- [ ] 手工改 1 个测试地点名称，确认地图与列表同步变化后还原（或留 fixture）。
- [ ] Commit：`extract MAP_DATA into JSON configs`

---

## Task 3: 定义 schema 与校验

**Goal:** 改配置时尽早发现缺字段/非法精度，而不是地图静默丢点。

**Files:**
- Create: `src/types/place.ts`
- Create: `scripts/validate-places.mjs`（或 vitest）

- [ ] 类型覆盖：`category`, `status`, `precision`, 可选 `candidates[]`, `lat/lon` 可空（pending）。
- [ ] 校验规则：`id` 唯一；`precision !== pending` 时需有坐标；`category` 四选一；嵌套 candidate 的 `id` 不与父级冲突策略写清。
- [ ] `npm run validate:places` 对当前 94 条通过。
- [ ] Commit：`add place config types and validator`

---

## Task 4: Vite + Vue3 脚手架与静态资源接入

**Goal:** 空壳可跑，轮廓 JSON 进 `public/`，vendor 用 npm 而不是内嵌 4MB 脚本。

**Files:**
- Create: Vite Vue-TS 工程文件（`package.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/App.vue`）
- Move: `outline-fallback.json` → `public/`
- Move: 配置 JSON → `src/config/` 或 `public/config/`（若需运行时热替换无重建，优先 `public/config/`）

- [ ] `npm create vite@latest`（vue-ts），装 `leaflet`、`maplibre-gl`、`@maplibre/maplibre-gl-leaflet` 及 `@types/leaflet`。
- [ ] 确认 MapLibre worker 在 Vite 下可用（`maplibre-gl/dist/maplibre-gl-csp-worker` 或官方推荐 worker 配法）；失败则回退轮廓（与现逻辑一致）。
- [ ] `npm run dev` 空白页可开；Commit：`chore: scaffold Vue3 Vite app`

---

## Task 5: 迁 CSS 与壳组件（无地图逻辑）

**Goal:** 布局骨架先对：header + main + 侧栏/移动端抽屉。

**Files:**
- Create: `src/assets/styles/map.css`（从现 HTML 自定义 CSS 拷入，保留移动端 `#map { inset: 0 }`）
- Create: `AppHeader.vue`, `SidePanel.vue`, `BasemapSwitch.vue`, `TileBanner.vue`
- Modify: `App.vue`

- [ ] 复刻 DOM 结构与 class，390 宽度下 header 与地图区无额外空隙（可先放空 `#map` 占位）。
- [ ] 面板 collapsed / grip 行为用 Vue state 实现。
- [ ] Commit：`feat: port shell layout components and CSS`

---

## Task 6: `TravelMap.vue` — Leaflet 核心与底图状态机

**Goal:** 地图行为对等（本计划最关键、最易回归的一块）。

**Files:**
- Create: `src/components/TravelMap.vue`, `src/lib/basemap.ts`, `src/lib/outline.ts`
- Modify: `App.vue`（传入 config / emit 选中）

- [ ] `onMounted` 创建 `L.map`，`onBeforeUnmount` `map.remove()`。
- [ ] 迁入 OFM + 内置轮廓状态机（user 点击优先、OFM 未就绪不抢选）。
- [ ] 加载 `outline-fallback.json` 画陆海路网；默认视图 `views.play`。
- [ ] 验收：两按钮切换、离线轮廓可用、不请求禁用瓦片域名。
- [ ] Commit：`feat: port Leaflet map and basemap state machine`

---

## Task 7: 标记、标签、筛选、列表、详情

**Goal:** 地点交互全链路对等。

**Files:**
- Create: `src/lib/markers.ts`, `PlaceList.vue`, `PlaceDetail.vue`, `FilterToolbar.vue`, `DocGuide.vue`
- Modify: `TravelMap.vue`, `SidePanel.vue`

- [ ] 按 `places.json` + `marker-offsets.json` 打点；类别色；常显名；区域名。
- [ ] 筛选 chip + 搜索与现 `itemVisible` 一致；列表 94 项；候选展示。
- [ ] 点击列表/点 ↔ 详情；视图按钮 fitBounds。
- [ ] 对照 Task 1 清单全绿（360/390/430 + 桌面截图可更新 artifacts）。
- [ ] Commit：`feat: port places markers filters and panel`

---

## Task 8: 开发体验与「改配置」说明

**Goal:** 你之后只碰 JSON 就能换地点。

**Files:**
- Modify: `README.md`
- Optional: `public/config/places.json` 若选择运行时加载

- [ ] README 写清：改哪些文件、字段含义、如何 `validate`、如何 dev/build。
- [ ] 约定：大改行程只改 `places.json` / `map-meta.json`；不要手改 `outline-fallback.json` 除非重建底图。
- [ ] Commit：`docs: explain JSON-driven place editing`

---

## Task 9: 推到你的 GitHub 仓库

**Goal:** 代码在你指定的 GitHub 远程，而不是仅 Origin 临时仓。

**Files:** 无代码；git remote

- [ ] 你提供目标仓库 URL（新建空仓或已有仓）；本 agent 加 `git remote`（如 `github`）并 push 主分支。
- [ ] 确认 `.gitignore` 含 `node_modules`、`dist`；`outline-fallback.json` 若超限再议 LFS（当前 ~2.8MB 一般可直接进库）。
- [ ] 不在本任务做公开 GitHub Pages/Vercel 强制发布（除非你另开口）。
- [ ] Commit/push 以你仓库为准。

---

## 风险速查（执行时盯住）

| 风险 | 应对 |
|------|------|
| MapLibre worker 在 Vite 挂了 | 保留轮廓优先路径；测 OFM 失败回退 |
| 把 2.8MB fallback 放进 places.json | 禁止；已拆文件 |
| Vue 深度响应式包住 Leaflet Layer | 地图层放非响应式 ref/裸对象 |
| 单文件分发需求 | 可选后续 `vite-plugin-singlefile`，不阻塞 Vue 化 |
| 与旧 HTML 双轨 | Task 2 通过后以 Vue 为准；旧 HTML 可留 `legacy/` 一份 |

---

## 不在本计划内

- 换城市通用 SaaS、账号后台、CMS
- 高德/百度瓦片或 GCJ-02 混用
- 重做 UI 视觉（除非迁的过程中发现必须的 class 对齐）

---

## 建议你怎么瞅

1. 是否同意 **配置三（四）分**：`places` / `map-meta` / `offsets` / `outline-fallback`？  
2. GitHub 是 **新空仓库** 还是挂到已有 repo？URL 可下一回合给。  
3. 是否还要 **build 出单 HTML**？要的话加 Task 10，不要则到 Task 9 结束。

你点头后按 Task 1 → 9 做；若只想先要「能改 JSON」，做到 Task 2/3 就可以停一版给你用。
