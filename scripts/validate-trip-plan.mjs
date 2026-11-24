/**
 * 校验 trip-plan.json：
 * - schema 基本结构
 * - day / node / segment id 唯一
 * - placeId 均能在 places.json（含 candidates）找到
 * - exclusions 中的 id 不得出现在任何 node 的 primary/optional 里
 * - 非 pending 锚点应有 lat/lon（primary 用于画路线）
 * - contentStatus=awaiting-planner 时允许空 nodes（骨架）
 *
 * 用法：npm run validate:trip-plan
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const plan = JSON.parse(readFileSync(join(root, 'src/config/trip-plan.json'), 'utf8'))
const places = JSON.parse(readFileSync(join(root, 'src/config/places.json'), 'utf8'))

const MODES = new Set(['walk', 'transit', 'ferry', 'taxi', 'other'])
const ROUTE_KINDS = new Set(['schematic', 'mapped', null, undefined])
const STATUSES = new Set(['awaiting-planner', 'draft', 'ready'])

const placeIndex = new Map()
for (const p of places) {
  placeIndex.set(p.id, p)
  for (const c of p.candidates || []) {
    placeIndex.set(c.id, { ...c, _parentId: p.id, precision: c.precision || p.precision })
  }
}

let errors = 0
let warnings = 0

function fail(msg) {
  console.error('FAIL:', msg)
  errors += 1
}

function warn(msg) {
  console.warn('WARN:', msg)
  warnings += 1
}

if (!plan || typeof plan !== 'object') fail('trip-plan root must be object')
if (plan.schemaVersion !== 1) fail(`schemaVersion must be 1, got ${plan.schemaVersion}`)
if (!plan.timezone) fail('timezone required')
if (!STATUSES.has(plan.contentStatus)) fail(`bad contentStatus ${plan.contentStatus}`)
if (!Array.isArray(plan.days) || !plan.days.length) fail('days[] required and non-empty')

const excluded = new Set()
for (const ex of plan.exclusions || []) {
  if (!ex.placeId) fail('exclusion missing placeId')
  else {
    excluded.add(ex.placeId)
    if (!placeIndex.has(ex.placeId)) fail(`exclusion placeId not in places: ${ex.placeId}`)
  }
}

const dayIds = new Set()
const allNodeIds = new Set()

for (const day of plan.days) {
  if (!day.id) fail('day missing id')
  if (dayIds.has(day.id)) fail(`duplicate day id ${day.id}`)
  dayIds.add(day.id)
  if (!day.label) fail(`day ${day.id} missing label`)
  if (!Array.isArray(day.nodes)) fail(`day ${day.id} nodes must be array`)
  if (!Array.isArray(day.segments)) fail(`day ${day.id} segments must be array`)

  const nodeIds = new Set()
  for (const node of day.nodes) {
    if (!node.id) fail(`day ${day.id} node missing id`)
    if (nodeIds.has(node.id)) fail(`duplicate node id ${node.id} in ${day.id}`)
    if (allNodeIds.has(node.id)) fail(`node id ${node.id} reused across days`)
    nodeIds.add(node.id)
    allNodeIds.add(node.id)
    if (!node.title) fail(`node ${node.id} missing title`)
    if (!Array.isArray(node.primaryPlaceIds) || !node.primaryPlaceIds.length) {
      fail(`node ${node.id} needs primaryPlaceIds`)
    }
    for (const pid of node.primaryPlaceIds || []) {
      if (excluded.has(pid)) fail(`excluded place ${pid} used as primary in node ${node.id}`)
      if (!placeIndex.has(pid)) fail(`unknown primaryPlaceId ${pid} in node ${node.id}`)
      else {
        const pl = placeIndex.get(pid)
        if (pl.lat == null || pl.lon == null) {
          warn(`primary ${pid} in node ${node.id} has no coordinates (will skip on map)`)
        }
      }
    }
    for (const pid of node.optionalPlaceIds || []) {
      if (excluded.has(pid)) fail(`excluded place ${pid} used as optional in node ${node.id}`)
      if (!placeIndex.has(pid)) fail(`unknown optionalPlaceId ${pid} in node ${node.id}`)
    }
  }

  const segIds = new Set()
  for (const seg of day.segments) {
    if (!seg.id) fail(`day ${day.id} segment missing id`)
    if (segIds.has(seg.id)) fail(`duplicate segment id ${seg.id}`)
    segIds.add(seg.id)
    if (!nodeIds.has(seg.fromNodeId)) fail(`segment ${seg.id} bad fromNodeId ${seg.fromNodeId}`)
    if (!nodeIds.has(seg.toNodeId)) fail(`segment ${seg.id} bad toNodeId ${seg.toNodeId}`)
    if (!MODES.has(seg.mode)) fail(`segment ${seg.id} bad mode ${seg.mode}`)
    if (!ROUTE_KINDS.has(seg.routeKind)) fail(`segment ${seg.id} bad routeKind ${seg.routeKind}`)
    if (seg.geometry != null) {
      if (!Array.isArray(seg.geometry) || seg.geometry.length < 2) {
        fail(`segment ${seg.id} geometry must be [[lat,lon],...] length>=2`)
      }
    }
  }

  if (plan.contentStatus === 'ready' && day.nodes.length === 0) {
    fail(`contentStatus=ready but day ${day.id} has empty nodes`)
  }
}

if (errors) {
  console.error(`validation failed with ${errors} error(s), ${warnings} warning(s)`)
  process.exit(1)
}
console.log(
  `OK: trip-plan schemaVersion=${plan.schemaVersion} days=${plan.days.length} ` +
    `nodes=${allNodeIds.size} exclusions=${excluded.size} contentStatus=${plan.contentStatus}` +
    (warnings ? ` warnings=${warnings}` : ''),
)
