#!/usr/bin/env node
// Generate web/src/lib/countryIso3Map.ts from an Excel file containing UCDP country IDs
// Usage: node scripts/generate-iso3-map.mjs [--input ../country_ID.xlsx] [--sheet Sheet1]
// The script looks for columns: country_id (or id), iso3 (optional), and name (fallback to derive iso3)

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

async function main() {
  const args = new Map()
  const argv = process.argv.slice(2)
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const [k, inline] = a.split('=')
    if (inline !== undefined && inline !== '') {
      args.set(k, inline)
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      args.set(k, argv[i + 1])
      i++
    } else {
      args.set(k, 'true')
    }
  }
  let input = args.get('--input')
  if (!input) {
    const candidates = [
      '../Country_ID.csv',
      '../country_ID.csv',
      '../Country_ID.xlsx',
      '../country_ID.xlsx',
    ].map((p) => path.resolve(process.cwd(), p))
    input = candidates.find((p) => fs.existsSync(p)) || path.resolve(process.cwd(), '../country_ID.xlsx')
  }
  const sheetNameArg = args.get('--sheet')

  const countriesMod = await import('world-countries')
  const countries = countriesMod.default || countriesMod

  if (!fs.existsSync(input)) {
    console.error(`Input file not found: ${input}`)
    process.exit(1)
  }

  const ext = path.extname(input).toLowerCase()
  /** @type {any[]} */
  let rows = []
  if (ext === '.xlsx' || ext === '.xls') {
    const { default: xlsx } = await import('xlsx')
    const wb = xlsx.readFile(input)
    const sheetName = sheetNameArg || wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    if (!ws) {
      console.error(`Sheet not found: ${sheetName}. Available: ${wb.SheetNames.join(', ')}`)
      process.exit(1)
    }
    rows = xlsx.utils.sheet_to_json(ws)
  } else if (ext === '.csv') {
    const raw = fs.readFileSync(input, 'utf8')
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length)
    if (!lines.length) {
      console.error('CSV file is empty')
      process.exit(1)
    }
    const headerLine = lines[0]
    const delim = headerLine.includes(';') ? ';' : headerLine.includes(',') ? ',' : '\t'
    const headers = headerLine.split(delim).map((h) => h.trim())
    rows = lines.slice(1).map((line) => {
      const cols = line.split(delim)
      const o = {}
      headers.forEach((h, i) => (o[h] = (cols[i] ?? '').trim()))
      return o
    })
  } else {
    console.error(`Unsupported input type: ${ext}. Use .xlsx or .csv`)
    process.exit(1)
  }
  const map = /** @type {Record<number, string>} */ ({})

  function normalizeName(s) {
    return String(s || '').trim().toLowerCase()
  }

  function findIso3ByName(name) {
    if (!name) return null
    let n = normalizeName(name)
    // strip content in parentheses and punctuation variants
    n = n.replace(/\([^)]*\)/g, '').replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim()
    const alias = {
      'russian federation': 'RUS',
      'congo, democratic republic of the': 'COD',
      'congo': 'COG',
      'syrian arab republic': 'SYR',
      'dr congo': 'COD',
      'dr congo zaire': 'COD',
      'zaire': 'COD',
      'bosnia herzegovina': 'BIH',
      'cambodia': 'KHM',
      'cambodia kampuchea': 'KHM',
    }
    if (alias[n]) return alias[n]
    for (const c of countries) {
      const names = [c.name?.common, c.name?.official, ...(c.altSpellings || [])]
      if (names.some((x) => normalizeName(x) === n)) return c.cca3
    }
    return null
  }

  for (const r of rows) {
    // case-insensitive field lookup
    const obj = /** @type {Record<string, any>} */ (r)
    const get = (k) => obj[k] ?? obj[k.toLowerCase()] ?? obj[k.toUpperCase()]
    const id = Number(get('country_id') ?? get('id'))
    if (!Number.isFinite(id)) continue
    let iso3 = (get('iso3') ?? get('iso') ?? get('code') ?? '').toString().toUpperCase()
    if (!iso3 || iso3.length !== 3) {
      iso3 = findIso3ByName(get('name') ?? get('country') ?? get('country_name') ?? get('Country')) || ''
    }
    if (!iso3 || iso3.length !== 3) continue
    map[id] = iso3
  }

  const outFile = path.resolve(process.cwd(), 'src/lib/countryIso3Map.ts')
  const entries = Object.entries(map).sort((a, b) => Number(a[0]) - Number(b[0]))
  const body = entries.map(([k, v]) => `  ${Number(k)}: '${v}',`).join('\n')
  const out = `export const UCDP_COUNTRY_ISO3: Record<number, string> = {\n${body}\n}\n`
  fs.writeFileSync(outFile, out)
  console.log(`Wrote ${entries.length} mappings to ${path.relative(process.cwd(), outFile)}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
