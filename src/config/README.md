# 配置文件说明（改地点先看这里）

JSON **不能写注释**，所以字段含义写在本文件。日常只改 `places.json` 即可。

## 四个文件各干什么

| 文件 | 要不要常改 | 作用 |
|------|------------|------|
| `places.json` | **主要改这个** | 94 个地点 + 嵌套候选店 |
| `map-meta.json` | 偶尔 | 视图范围、区域名、高亮线、行程说明文案 |
| `marker-offsets.json` | 很少 | 两个点坐标太近时，图上错开显示的偏移量 |
| `outline-fallback.json` | 几乎不改 | 离线「内置轮廓」底图的海岸线/路网几何（很大） |

改完地点后在项目根目录跑：

```bash
npm run validate:places
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
| `category` | 类型，只能是下面四个之一。 |
| `status` | 来源标记：`named` 名单内 / `alt` 备选 / `doc` 文档补入。 |
| `precision` | 坐标精度，影响点和徽章样式。 |

### category（类型 → 颜色）

| 值 | 中文 | 图上颜色 |
|----|------|----------|
| `scenic` | 景点 | 青蓝 |
| `food` | 餐饮 | 橙 |
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
