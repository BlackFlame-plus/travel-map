# 配置文件说明（改地点 / 行程先看这里）

JSON **不能写注释**，所以字段含义写在本文件。日常改地点用 `places.json`；改每日行程用 `trip-plan.json`。

## 配置文件各干什么

| 文件 | 要不要常改 | 作用 |
|------|------------|------|
| `places.json` | **主数据** | 94 个地点 + 嵌套候选店（真坐标只维护在这里） |
| `trip-plan.json` | **行程** | 每日节点 / 路段 / 排除项；只引用 places 全局 id |
| `map-meta.json` | 偶尔 | 视图范围、区域名、高亮线、行程说明文案 |
| `marker-offsets.json` | 很少 | 两个点坐标太近时，图上错开显示的偏移量 |
| `outline-fallback.json` | 几乎不改 | 离线「内置轮廓」底图的海岸线/路网几何（很大） |

改完后在项目根目录跑：

```bash
npm run validate
# 或分别：
npm run validate:places
npm run validate:trip-plan
```

## places.json — 一条地点长什么样

```json
{
  "id": "50",
  "num": "50",
  "name": "白色日记",
  "category": "food",
  "status": "named",
  "precision": "candidate",
  "lat": 36.06,
  "lon": 120.38,
  "address": "市南区某某路",
  "note": "备注，可多行",
  "source": "坐标来源说明",
  "label": "可选：地图上强制显示的短名",
  "hideDot": false,
  "candidates": []
}
```

### 必填字段

| 字段 | 含义 |
|------|------|
| `id` | 全局唯一 ID（字符串）。候选点子项也要唯一。 |
| `num` | 清单里显示的编号（可与 id 相同，也可如 `1a`）。 |
| `name` | 地点名称。 |
| `category` | 类型，只能是下面五个之一。 |
| `status` | 来源标记：`named` 名单内 / `alt` 备选 / `doc` 文档补入。 |
| `precision` | 坐标精度，影响点和徽章样式。 |

### category（类型 → 颜色）

| 值 | 中文 | 图上颜色 |
|----|------|----------|
| `scenic` | 景点 | 青蓝 |
| `food` | 餐饮 | 橙 |
| `coffee` | 咖啡 | 棕 |
| `bar` | 酒馆 | 紫 |
| `culture` | 文创体验 | 绿 |

### precision（精度 → 点和徽章）

| 值 | 中文 | 图上表现 |
|----|------|----------|
| `exact` | 精确位置 | 实心小点 |
| `approx` | 约略位置 | 描边点 |
| `area` | 街区/范围 | 描边 + 虚线圈 |
| `area-ref` | 范围参考 | 类似 area |
| `candidate` | 候选（未指定） | 描边点，侧栏「候选」徽章 |
| `pending` | 待定位 | 可无坐标；不在图上编造位置 |

### 常用可选字段

| 字段 | 含义 |
|------|------|
| `lat` / `lon` | WGS84 纬度/经度。`pending` 且不上图时可省略。 |
| `address` | 地址文案。 |
| `note` | 备注（支持 `\n` 换行）。 |
| `source` | 坐标/信息来源，方便以后核对。 |
| `label` | 若填写，地图常显名优先用它，而不是 `name`。 |
| `hideDot` | `true` 时主点不上图（只靠 `candidates` 显示分店时有用）。 |
| `foodKind` | 餐饮细分（可选，纯备注用）。 |
| `candidates` | 同一条目下的分店/候选点数组，字段与主点类似（`id/name/lat/lon/...`）。 |

### 新增一个地点的最短步骤

1. 复制一条相近的对象，改 `id`（别和已有重复）。
2. 填 `name`、`category`、`precision`、`lat`、`lon`、`note`。
3. 跑 `npm run validate:places`。
4. `npm run dev` 看图；满意后 `npm run build` / 推送 GitHub。

## map-meta.json

- `views`：侧栏「游玩区 / 市区 / …」按钮对应的 `bounds`（西南角、东北角）。
- `areaLabels`：地图上的区名/片区名，`minZ`/`maxZ` 控制哪级缩放才显示。
- `highlights`：强调线（如琴屿路一带）。
- `docGuide`：侧栏折叠的「文档行程」说明。

## marker-offsets.json

键是地点/候选的 `id`，值是 `{ "dlat": 纬度偏移, "dlon": 经度偏移 }`。  
只影响**显示位置**；真实中心仍用原始 `lat/lon`，并用细线连回。

## outline-fallback.json

离线底图几何，体积很大。不要手改坐标；只有要重做离线路网时才动。

## trip-plan.json — 每日行程

地点坐标**不要**写进本文件；用 `places.json` / `candidates` 的全局 `id` 引用。

### 日结构约定（已与用户确认）

- 默认 **恰好 3 个完整游览日**：`day1` / `day2` / `day3`，`date: null`（时间住宿未定，不绑元旦日期）。
- **不要**加 Day0 / Day4 假装抵达/返程游玩日。
- 草案主题可写在 `summary`；真正节点进 `nodes`/`segments` 后把 `contentStatus` 改为 `draft` 或 `ready`。
- 陈记食集 `placeId: "10"` 只进 `exclusions`，不删 places。
- 老杰克：默认一晚放某节点 `primaryPlaceIds`（或 notes）；其余分店只进 `optionalPlaceIds`。

```json
{
  "schemaVersion": 1,
  "timezone": "Asia/Shanghai",
  "contentStatus": "draft",
  "assumptions": ["市南可调整草案；date 均为 null"],
  "exclusions": [{ "placeId": "10", "reason": "陈记食集：本次行程排除，不为它绕路" }],
  "days": [
    {
      "id": "day1",
      "label": "Day 1",
      "date": null,
      "summary": "老城—画像—琴屿路",
      "nodes": [
        {
          "id": "d1-n1",
          "title": "老城",
          "startTime": null,
          "endTime": null,
          "durationMinutes": null,
          "primaryPlaceIds": ["景点锚点id"],
          "optionalPlaceIds": ["近距餐饮或咖啡id"],
          "meal": null,
          "notes": "室内馆只主选1；登山可选说明可写这里"
        }
      ],
      "segments": [
        {
          "id": "d1-s1",
          "fromNodeId": "d1-n1",
          "toNodeId": "d1-n2",
          "mode": "walk",
          "estimatedMinutes": 20,
          "geometry": null,
          "routeKind": "schematic",
          "note": "路线示意，非导航"
        }
      ]
    }
  ]
}
```

### 字段一览（策划填内容用）

| 路径 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `schemaVersion` | number | 是 | 固定 `1` |
| `timezone` | string | 是 | 建议 `Asia/Shanghai` |
| `contentStatus` | string | 是 | `awaiting-planner` \| `draft` \| `ready`（`ready` 时不允许空 `nodes`） |
| `assumptions` | string[] | 否 | 给人看的假设/约束 |
| `exclusions[]` | object | 否 | 计划排除（不删主数据） |
| `exclusions[].placeId` | string | 是* | places/candidates 全局 id |
| `exclusions[].reason` | string | 是* | 排除原因 |
| `days[]` | object | 是 | 游览日列表（默认 3 天） |
| `days[].id` | string | 是 | 唯一，建议 `day1`/`day2`/`day3` |
| `days[].label` | string | 是 | UI 按钮文案，如 `Day 1` |
| `days[].date` | string\|null | 否 | `YYYY-MM-DD` 或 **`null`（当前约定）** |
| `days[].summary` | string\|null | 否 | 当日一句话主题 |
| `days[].nodes[]` | object | 是 | 可先 `[]`；定稿后按行程节点填 |
| `nodes[].id` | string | 是 | 全局唯一节点 id（建议 `d1-n1`） |
| `nodes[].title` | string | 是 | 节点名（片区/景点锚） |
| `nodes[].startTime` | string\|null | 否 | `HH:mm`，未定可 `null` |
| `nodes[].endTime` | string\|null | 否 | `HH:mm`，未定可 `null` |
| `nodes[].durationMinutes` | number\|null | 否 | 停留分钟 |
| `nodes[].primaryPlaceIds` | string[] | 是 | 锚点 id，至少一个；优先景点 |
| `nodes[].optionalPlaceIds` | string[] | 否 | 近且可步行的餐饮/咖啡/备选分店，**不进主路线** |
| `nodes[].meal` | object\|null | 否 | `{ kind, note }`；`kind` 如 breakfast/lunch/dinner/snack |
| `nodes[].notes` | string\|null | 否 | 可选说明（登山可选、馆只选1 等） |
| `days[].segments[]` | object | 是 | 可先 `[]`；只连实际计划节点 |
| `segments[].id` | string | 是 | 唯一路段 id |
| `segments[].fromNodeId` | string | 是 | = 某 `nodes[].id` |
| `segments[].toNodeId` | string | 是 | = 某 `nodes[].id` |
| `segments[].mode` | string | 是 | `walk` \| `transit` \| `ferry` \| `taxi` \| `other` |
| `segments[].estimatedMinutes` | number\|null | 否 | 估时 |
| `segments[].geometry` | [lat,lon][]\|null | 否 | 有则折线；无则直线示意 |
| `segments[].routeKind` | string\|null | 否 | `schematic` \| `mapped`；无 geometry 当 schematic |
| `segments[].note` | string\|null | 否 | 建议示意线写「路线示意，非导航」 |

填完后：`npm run validate:trip-plan`（或 `npm run validate`）。
