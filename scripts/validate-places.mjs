import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const places = JSON.parse(readFileSync(join(root, 'src/config/places.json'), 'utf8'))

const CATS = new Set(['scenic', 'food', 'bar', 'culture'])
const PREC = new Set(['exact', 'approx', 'area', 'area-ref', 'candidate', 'pending'])
const ids = new Set()
let errors = 0

function fail(msg) {
  console.error('FAIL:', msg)
  errors += 1
}

if (!Array.isArray(places) || places.length !== 94) {
  fail(`expected 94 places, got ${places?.length}`)
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
    }
  }
}

if (errors) {
  console.error(`validation failed with ${errors} error(s)`)
  process.exit(1)
}
console.log(`OK: ${places.length} places, ${ids.size} ids`)
