/**
 * 地点相关 TypeScript 类型。
 * 与 src/config/places.json 字段一一对应；改 JSON 时对照本文件和 config/README.md。
 */

/** 地点大类 → 图上颜色（见 map-engine 里的 CATS） */
export type PlaceCategory = 'scenic' | 'food' | 'bar' | 'culture'

/** 名单来源：正式名单 / 备选 / 从用户文档补入 */
export type PlaceStatus = 'named' | 'alt' | 'doc'

/**
 * 坐标精度：
 * - exact     精确店址/门牌
 * - approx    约略位置
 * - area      街区/范围（画虚线圈）
 * - area-ref  范围参考
 * - candidate 候选，尚未指定具体分店
 * - pending   待定位（可无 lat/lon，不上图编造）
 */
export type PlacePrecision =
  | 'exact'
  | 'approx'
  | 'area'
  | 'area-ref'
  | 'candidate'
  | 'pending'

/** 主地点下的分店 / 候选点（嵌套在 place.candidates） */
export interface PlaceCandidate {
  /** 全局唯一；不要和主地点或其他候选重复 */
  id: string
  name: string
  /** WGS84 纬度；没有坐标就不要上图 */
  lat?: number | null
  /** WGS84 经度 */
  lon?: number | null
  address?: string
  note?: string
  /** 若填了，地图常显名优先用这个 */
  label?: string
  [key: string]: unknown
}

/** places.json 里的一条主地点 */
export interface Place {
  /** 全局唯一 ID */
  id: string
  /** 侧栏清单显示的编号（如 "50" 或 "1a"） */
  num: string
  name: string
  category: PlaceCategory
  status: PlaceStatus
  precision: PlacePrecision
  lat?: number | null
  lon?: number | null
  address?: string
  note?: string
  /** 坐标/资料来源，给人看的，不影响渲染 */
  source?: string
  /** 地图强制短名（可选） */
  label?: string
  foodKind?: string
  /** true = 主点不上图（只显示 candidates） */
  hideDot?: boolean
  /** 同一条目下的多个候选/分店 */
  candidates?: PlaceCandidate[]
  [key: string]: unknown
}
