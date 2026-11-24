/**
 * 校验 places.json 是否还能被地图引擎正常吃进去。
 *
 * 检查项：
 * - 正好 90 条主地点（t72 台东归组 + 崂山点后；若你故意增删，改下面的期望数量）
 * - id 全局唯一（含 candidates）；当前期望 126 个 id
 * - category / precision 落在允许枚举内（候选可选自带 category）
 * - 非 pending、且未 hideDot 的点必须有 lat/lon
 *
 * 用法：npm run validate:places
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const places = JSON.parse(readFileSync(join(root, 'src/config/places.json'), 'utf8'))

const CATS = new Set(['scenic', 'food', 'coffee', 'bar', 'culture'])
const PREC = new Set(['exact', 'approx', 'area', 'area-ref', 'candidate', 'pending'])
const ids = new Set()
let errors = 0

function fail(msg) {
  console.error('FAIL:', msg)
  errors += 1
}

const EXPECTED_PLACE_COUNT = 90
const EXPECTED_ID_COUNT = 126

if (!Array.isArray(places) || places.length !== EXPECTED_PLACE_COUNT) {
  fail(`expected ${EXPECTED_PLACE_COUNT} places, got ${places?.length}`)
}

for (const p of places) {
  if (!p.id) fail('place missing id')
  if (ids.has(p.id)) fail(`duplicate id ${p.id}`)
  ids.add(p.id)
  if (!CATS.has(p.category)) fail(`${p.id} bad category ${p.category}`)
  if (!PREC.has(p.precision)) fail(`${p.id} bad precision ${p.precision}`)
  if (p.precision !== 'pending' && !p.hideDot && (p.lat == null || p.lon == null)) {
    fail(`${p.id} non-pending without coordinates`)
  }
  if (Array.isArray(p.candidates)) {
    for (const c of p.candidates) {
      if (!c.id) fail(`${p.id} candidate missing id`)
      if (ids.has(c.id)) fail(`duplicate candidate id ${c.id}`)
      ids.add(c.id)
      if (c.category != null && !CATS.has(c.category)) {
        fail(`${c.id} bad candidate category ${c.category}`)
      }
      if (c.precision != null && !PREC.has(c.precision)) {
        fail(`${c.id} bad candidate precision ${c.precision}`)
      }
    }
  }
}

if (ids.size !== EXPECTED_ID_COUNT) {
  fail(`expected ${EXPECTED_ID_COUNT} unique ids, got ${ids.size}`)
}

if (errors) {
  console.error(`validation failed with ${errors} error(s)`)
  process.exit(1)
}
console.log(`OK: ${places.length} places, ${ids.size} ids`)
