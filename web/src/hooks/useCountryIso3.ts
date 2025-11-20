import { useGedEventsByCountryLastYear } from './useGedEvents'
import { useEffect, useMemo, useState } from 'react'
import { feature as topojsonFeature } from 'topojson-client'
import { UCDP_COUNTRY_ISO3 } from '../lib/countryIso3Map'

function pointInRing(lon: number, lat: number, ring: number[][]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect = ((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi + 0.0) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

function featureContainsLonLat(f: any, lon: number, lat: number) {
  if (!f?.geometry) return false
  const g = f.geometry
  if (g.type === 'Polygon') {
    const rings = g.coordinates as number[][][]
    if (!rings.length) return false
    const insideOuter = pointInRing(lon, lat, rings[0])
    if (!insideOuter) return false
    for (let i = 1; i < rings.length; i++) {
      if (pointInRing(lon, lat, rings[i])) return false
    }
    return true
  }
  if (g.type === 'MultiPolygon') {
    const polys = g.coordinates as number[][][][]
    for (const poly of polys) {
      if (!poly.length) continue
      const insideOuter = pointInRing(lon, lat, poly[0])
      if (!insideOuter) continue
      let inHole = false
      for (let i = 1; i < poly.length; i++) {
        if (pointInRing(lon, lat, poly[i])) { inHole = true; break }
      }
      if (!inHole) return true
    }
  }
  return false
}

export function useCountryIso3(countryId: number) {
  const { data } = useGedEventsByCountryLastYear(countryId, 2)
  const events = data?.events ?? []
  let mappedIso3 = UCDP_COUNTRY_ISO3[countryId]
  try {
    if (!mappedIso3) {
      const s = localStorage.getItem('ucdpIso3Map')
      const m = s ? (JSON.parse(s) as Record<number, string>) : {}
      if (m && m[countryId]) mappedIso3 = m[countryId]
    }
  } catch {}

  const centroid = useMemo(() => {
    if (!events.length) return null as null | { lat: number; lon: number }
    let lat = 0, lon = 0
    for (const e of events) { lat += e.latitude; lon += e.longitude }
    return { lat: lat / events.length, lon: lon / events.length }
  }, [events])

  const [iso3, setIso3] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      // Deterministic fast-path via mapping
      if (mappedIso3) { setIso3(mappedIso3); setLoading(false); return }
      if (!centroid) { setIso3(null); return }
      setLoading(true)
      try {
        const [{ default: topo }, wcMod] = await Promise.all([
          import('world-atlas/countries-110m.json'),
          import('world-countries'),
        ])
        const fc = topojsonFeature((topo as any), (topo as any).objects.countries) as unknown as { type: 'FeatureCollection'; features: any[] }
        const features = fc.features || []
        const match = features.find((f) => featureContainsLonLat(f, centroid.lon, centroid.lat))
        if (!match) { setIso3(null); return }
        const name = String(match.properties?.name || '')
        const wcs = (wcMod as any).default ?? (wcMod as any)
        const lower = name.toLowerCase()
        let found: any = wcs.find((c: any) => c.name?.common?.toLowerCase() === lower || c.name?.official?.toLowerCase() === lower || (Array.isArray(c.altSpellings) && c.altSpellings.some((s: string) => s.toLowerCase() === lower)))
        if (!found) {
          // Minimal alias handling
          const alias: Record<string, string> = {
            'russian federation': 'RUS',
            'congo, democratic republic of the': 'COD',
            'congo': 'COG',
            'syrian arab republic': 'SYR',
          }
          const a = alias[lower]
          if (a) { setIso3(a); return }
        }
        const val = found?.cca3 ?? null
        setIso3(val)
        if (val) {
          try {
            const s = localStorage.getItem('ucdpIso3Map')
            const m = s ? (JSON.parse(s) as Record<number, string>) : {}
            if (!m[countryId]) {
              m[countryId] = val
              localStorage.setItem('ucdpIso3Map', JSON.stringify(m))
            }
          } catch {}
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [centroid, mappedIso3])

  return { iso3: mappedIso3 ?? iso3, loading: mappedIso3 ? false : loading }
}
