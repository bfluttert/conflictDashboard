import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON } from 'react-leaflet'
import { useGedEventsLastYear } from '../hooks/useGedEvents'
import { useEffect, useMemo, useState } from 'react'
import { feature as topojsonFeature } from 'topojson-client'
import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useGedEventsLastYear(3)

  const events = data?.events ?? []

  // Lazy-load Natural Earth polygons (TopoJSON) and convert to GeoJSON features
  const [world, setWorld] = useState<any[] | null>(null)
  useEffect(() => {
    let mounted = true
    import('world-atlas/countries-110m.json').then((mod: any) => {
      if (!mounted) return
      const topo = mod.default ?? mod
      const fc = topojsonFeature(topo as any, topo.objects.countries) as { type: 'FeatureCollection'; features: any[] }
      setWorld(fc.features || [])
    })
    return () => { mounted = false }
  }, [])

  // Group events by UCDP country_id, compute centroid and aggregates
  const countries = useMemo(() => {
    const map = new Map<number, { countryId: number; count: number; conflicts: Set<number>; sumBest: number; latSum: number; lonSum: number }>()
    for (const e of events) {
      const entry = map.get(e.country_id) ?? { countryId: e.country_id, count: 0, conflicts: new Set<number>(), sumBest: 0, latSum: 0, lonSum: 0 }
      entry.count += 1
      entry.conflicts.add(e.conflict_new_id)
      entry.sumBest += Number(e.best || 0)
      entry.latSum += e.latitude
      entry.lonSum += e.longitude
      map.set(e.country_id, entry)
    }
    return Array.from(map.values()).map(v => ({
      countryId: v.countryId,
      count: v.count,
      conflictCount: v.conflicts.size,
      sumBest: v.sumBest,
      lat: v.latSum / v.count,
      lon: v.lonSum / v.count,
    }))
  }, [events])

  // Point-in-polygon (ray casting). Input polygon rings are [lon,lat].
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

  function spansAntimeridian(f: any): boolean {
    if (!f?.geometry) return false
    const g = f.geometry
    const scan = (ring: number[][]) => {
      let min = 180, max = -180
      for (const [x] of ring) { if (x < min) min = x; if (x > max) max = x }
      return max - min > 180
    }
    if (g.type === 'Polygon') {
      const rings = g.coordinates as number[][][]
      if (!rings?.length) return false
      return scan(rings[0])
    }
    if (g.type === 'MultiPolygon') {
      const polys = g.coordinates as number[][][][]
      for (const poly of polys) {
        if (poly?.length && scan(poly[0])) return true
      }
    }
    return false
  }

  function featureContainsLonLat(f: any, lon: number, lat: number) {
    if (!f?.geometry) return false
    const g = f.geometry
    if (g.type === 'Polygon') {
      const rings = g.coordinates as number[][][]
      if (!rings.length) return false
      const insideOuter = pointInRing(lon, lat, rings[0])
      if (!insideOuter) return false
      // If in outer ring, ensure not in any hole
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

  const countriesWithFeature = useMemo(() => {
    if (!world || !world.length) return countries.map(c => ({ ...c, feature: null as any }))
    return countries.map(c => {
      const lon = c.lon, lat = c.lat
      const match = world.find((f: any) => featureContainsLonLat(f, lon, lat))
      return { ...c, feature: match ?? null }
    })
  }, [countries, world])

  return (
    <div className="h-screen w-screen">
      <MapContainer center={[20, 0]} zoom={2} className="h-full w-full">
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap
        />

        {countriesWithFeature.map((c) => {
          const f = c.feature
          if (f && f.geometry && !spansAntimeridian(f)) {
            return (
              <GeoJSON
                key={`geo-${c.countryId}`}
                data={f as any}
                style={() => ({ color: '#ef4444', weight: 1, fillColor: '#ef4444', fillOpacity: 0.25 })}
                eventHandlers={{ click: () => navigate(`/country/${c.countryId}`) }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{f.properties?.name || `Country ${c.countryId}`}</div>
                    <div>Events: {c.count.toLocaleString()}</div>
                    <div>Conflicts: {c.conflictCount.toLocaleString()}</div>
                    <div>Fatalities (best): {c.sumBest.toLocaleString()}</div>
                  </div>
                </Popup>
              </GeoJSON>
            )
          }
          // Fallback to dot (dataset not loaded or no matching feature)
          return (
            <CircleMarker
              key={`dot-${c.countryId}`}
              center={[c.lat, c.lon]}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.6 }}
              radius={Math.max(4, Math.min(16, Math.sqrt((c.sumBest || 0) + 1)))}
              eventHandlers={{ click: () => navigate(`/country/${c.countryId}`) }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">Country ID: {c.countryId}</div>
                  <div>Events: {c.count.toLocaleString()}</div>
                  <div>Conflicts: {c.conflictCount.toLocaleString()}</div>
                  <div>Fatalities (best): {c.sumBest.toLocaleString()}</div>
                  <button className="mt-2 underline text-blue-600" onClick={() => navigate(`/country/${c.countryId}`)}>View country details</button>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {isLoading && (
        <div className="absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-xs shadow">
          Loading events...
        </div>
      )}
      {error && (
        <div className="absolute left-2 top-2 rounded bg-red-600 text-white px-2 py-1 text-xs shadow">
          Failed to load events
        </div>
      )}
    </div>
  )
}

export default Home
