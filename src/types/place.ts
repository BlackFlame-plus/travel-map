export type PlaceCategory = 'scenic' | 'food' | 'bar' | 'culture'
export type PlaceStatus = 'named' | 'alt' | 'doc'
export type PlacePrecision =
  | 'exact'
  | 'approx'
  | 'area'
  | 'area-ref'
  | 'candidate'
  | 'pending'

export interface PlaceCandidate {
  id: string
  name: string
  lat?: number | null
  lon?: number | null
  address?: string
  note?: string
  label?: string
  [key: string]: unknown
}

export interface Place {
  id: string
  num: string
  name: string
  category: PlaceCategory
  status: PlaceStatus
  precision: PlacePrecision
  lat?: number | null
  lon?: number | null
  address?: string
  note?: string
  source?: string
  label?: string
  foodKind?: string
  hideDot?: boolean
  candidates?: PlaceCandidate[]
  [key: string]: unknown
}
