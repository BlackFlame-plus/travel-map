/**
 * 每日行程配置类型（src/config/trip-plan.json）。
 * 地点只引用 places.json / candidates 的全局 id，不在此重复真坐标。
 */

export type TripContentStatus =
  | 'awaiting-planner'
  | 'draft'
  | 'ready'

/** 路段交通方式（勿把跨海/公交假装成 walk） */
export type TripSegmentMode =
  | 'walk'
  | 'transit'
  | 'ferry'
  | 'taxi'
  | 'other'

/**
 * schematic = 直线示意（必须标注「路线示意，非导航」）
 * mapped = 有 geometry 折线（仍非导航级）
 */
export type TripRouteKind = 'schematic' | 'mapped'

export interface TripExclusion {
  /** places / candidates 全局 id */
  placeId: string
  reason: string
}

export interface TripNodeMeal {
  /** breakfast | lunch | dinner | snack | other */
  kind?: string
  note?: string
}

export interface TripNode {
  id: string
  title: string
  /** HH:mm 可选 */
  startTime?: string | null
  endTime?: string | null
  durationMinutes?: number | null
  /**
   * 节点锚点地点 id（优先景点）。
   * 用于定位节点、主路线端点；须能解析到有坐标的 place/candidate。
   */
  primaryPlaceIds: string[]
  /**
   * 该节点可去的餐饮/咖啡等（近且可步行）。
   * 不进入主路线 polyline，仅清单/筛选可见。
   */
  optionalPlaceIds?: string[]
  meal?: TripNodeMeal | null
  notes?: string | null
}

export interface TripSegment {
  id: string
  fromNodeId: string
  toNodeId: string
  mode: TripSegmentMode
  estimatedMinutes?: number | null
  /**
   * 可选折线 [[lat, lon], ...]；缺省则用两端节点锚点画直线示意。
   */
  geometry?: [number, number][] | null
  routeKind?: TripRouteKind | null
  note?: string | null
}

export interface TripDay {
  id: string
  label: string
  /** YYYY-MM-DD，可空 */
  date?: string | null
  summary?: string | null
  nodes: TripNode[]
  segments: TripSegment[]
}

export interface TripPlan {
  schemaVersion: number
  timezone: string
  contentStatus: TripContentStatus
  assumptions?: string[]
  exclusions?: TripExclusion[]
  days: TripDay[]
}
