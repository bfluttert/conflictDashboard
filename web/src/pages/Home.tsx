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
    import('world-atlas/countries-110m.json')
      .then((mod: any) => {
        if (!mounted) return
        const topo = mod.default ?? mod
        const fc = topojsonFeature(topo as any, topo.objects.countries) as unknown as { type: 'FeatureCollection'; features: any[] }
        console.log('TopoJSON loaded:', fc.features?.length, 'countries')
        setWorld(fc.features || [])
      })
      .catch(err => {
        console.error('Failed to load TopoJSON:', err)
      })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (data) console.log('UCDP Events loaded:', data.events?.length)
    if (error) console.error('UCDP Fetch Error:', error)
  }, [data, error])


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
    <div className="h-full w-full relative">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxBounds={[[-90, -180], [90, 180]]}
        className="h-full w-full grayscale-[0.2] brightness-[0.8]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          noWrap
          bounds={[[-90, -180], [90, 180]]}
        />

        {countriesWithFeature.map((c) => {
          const f = c.feature
          if (f && f.geometry && !spansAntimeridian(f)) {
            return (
              <GeoJSON
                key={`geo-${c.countryId}`}
                data={f as any}
                style={() => ({ color: '#ffffff', weight: 0.5, fillColor: '#ffffff', fillOpacity: 0.05 })}
                eventHandlers={{ click: () => navigate(`/country/${c.countryId}`) }}
              >
                <Popup>
                  <div className="text-xs font-sans p-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl text-white">
                    <div className="font-black uppercase tracking-widest mb-2 border-b border-white/10 pb-2">{f.properties?.name || `Country ${c.countryId}`}</div>
                    <div className="space-y-1 font-medium opacity-80">
                      <div>Events: <span className="font-black text-white">{c.count.toLocaleString()}</span></div>
                      <div>Conflicts: <span className="font-black text-white">{c.conflictCount.toLocaleString()}</span></div>
                      <div>Fatalities: <span className="font-black text-white">{c.sumBest.toLocaleString()}</span></div>
                    </div>
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
              pathOptions={{ color: '#ffffff', weight: 1, fillColor: '#ef4444', fillOpacity: 0.8 }}
              radius={Math.max(4, Math.min(16, Math.sqrt((c.sumBest || 0) + 1)))}
              eventHandlers={{ click: () => navigate(`/country/${c.countryId}`) }}
            >
              <Popup>
                <div className="text-xs font-sans p-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl text-white">
                  <div className="font-black uppercase tracking-widest mb-2 border-b border-white/10 pb-2">Country ID: {c.countryId}</div>
                  <div className="space-y-1 font-medium opacity-80">
                    <div>Events: {c.count.toLocaleString()}</div>
                    <div>Conflicts: {c.conflictCount.toLocaleString()}</div>
                    <div>Fatalities: {c.sumBest.toLocaleString()}</div>
                  </div>
                  <button
                    className="mt-4 w-full bg-white text-black font-black py-2 rounded-lg text-[10px] uppercase tracking-tighter"
                    onClick={() => navigate(`/country/${c.countryId}`)}
                  >
                    DEPLOY OVERVIEW
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>

      {isLoading && (
        <div className="absolute left-6 top-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/10 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all animate-pulse">
          Synchronizing Global Data...
        </div>
      )}
      {error && (
        <div className="absolute left-6 top-6 rounded-2xl bg-red-600/20 backdrop-blur-xl border border-red-500/50 text-red-100 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl">
          COMMUNICATION FAILURE
        </div>
      )}
      {!isLoading && !error && events.length === 0 && (
        <div className="absolute left-6 top-6 rounded-2xl bg-yellow-600/20 backdrop-blur-xl border border-yellow-500/50 text-yellow-100 px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl">
          NO DATA RECEIVED FROM UCDP
        </div>
      )}

    </div>
  )
}

export default Home
