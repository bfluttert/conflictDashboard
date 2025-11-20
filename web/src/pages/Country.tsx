import React from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import { useParams, useNavigate } from 'react-router-dom'
import { useGedEventsByCountryLastYear } from '../hooks/useGedEvents'
import { useMemo } from 'react'
import type { GedEvent } from '../lib/ucdp'

export default function Country() {
  const { countryId } = useParams()
  const idNum = Number(countryId)
  const navigate = useNavigate()
  const { data, isLoading, error } = useGedEventsByCountryLastYear(idNum)

  const events = data?.events ?? []

  const bounds = useMemo(() => {
    if (!events.length) return null as null | [[number, number], [number, number]]
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180
    for (const e of events) {
      if (e.latitude < minLat) minLat = e.latitude
      if (e.latitude > maxLat) maxLat = e.latitude
      if (e.longitude < minLon) minLon = e.longitude
      if (e.longitude > maxLon) maxLon = e.longitude
    }
    return [[minLat, minLon], [maxLat, maxLon]] as [[number, number], [number, number]]
  }, [events])

  function FitBounds({ b }: { b: [[number, number], [number, number]] | null }) {
    const map = useMap()
    // Fit bounds when b changes
    React.useEffect(() => {
      if (b) map.fitBounds(b, { padding: [20, 20] })
    }, [b, map])
    return null
  }

  function ClusteredEvents({
    events,
    countryId,
    navigate,
  }: {
    events: GedEvent[]
    countryId: number
    navigate: (to: string) => void
  }) {
    const map = useMap()
    const [zoom, setZoom] = React.useState(map.getZoom())

    React.useEffect(() => {
      const handler = () => setZoom(map.getZoom())
      map.on('zoomend', handler)
      return () => {
        map.off('zoomend', handler)
      }
    }, [map])

    const clusters = React.useMemo(() => {
      if (!events.length) return [] as Array<{
        id: string | number
        lat: number
        lon: number
        count: number
        sumBest: number
        sampleEvent: GedEvent
      }>

      if (zoom >= 11) {
        return events.map((e) => ({
          id: e.id,
          lat: e.latitude,
          lon: e.longitude,
          count: 1,
          sumBest: Number(e.best || 0),
          sampleEvent: e,
        }))
      }

      const baseCellSize = 0.5 // degrees at mid zoom
      const factor = Math.pow(2, zoom - 6) // smaller cells as we zoom in
      const cellSize = baseCellSize / factor

      const bucketMap = new Map<
        string,
        {
          latSum: number
          lonSum: number
          count: number
          sumBest: number
          sampleEvent: GedEvent
        }
      >()

      for (const e of events) {
        const best = Number(e.best || 0)
        const latIndex = Math.floor(e.latitude / cellSize)
        const lonIndex = Math.floor(e.longitude / cellSize)
        const key = `${latIndex}:${lonIndex}`
        const existing = bucketMap.get(key)
        if (existing) {
          existing.latSum += e.latitude
          existing.lonSum += e.longitude
          existing.count += 1
          existing.sumBest += best
        } else {
          bucketMap.set(key, {
            latSum: e.latitude,
            lonSum: e.longitude,
            count: 1,
            sumBest: best,
            sampleEvent: e,
          })
        }
      }

      return Array.from(bucketMap.entries()).map(([key, b]) => ({
        id: key,
        lat: b.latSum / b.count,
        lon: b.lonSum / b.count,
        count: b.count,
        sumBest: b.sumBest,
        sampleEvent: b.sampleEvent,
      }))
    }, [events, zoom])

    return (
      <>
        {clusters.map((c) => {
          const radius = Math.max(4, Math.min(18, 4 + Math.sqrt(c.count)))
          return (
            <CircleMarker
              key={c.id}
              center={[c.lat, c.lon]}
              pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.7 }}
              radius={radius}
              eventHandlers={{
                click: () => navigate(`/dashboard/${c.sampleEvent.conflict_new_id}?countryId=${countryId}`),
              }}
            >
              <Popup>
                <div className="text-sm">
                  <div className="font-semibold">
                    {c.count === 1 ? c.sampleEvent.conflict_name : `${c.count} events`}
                  </div>
                  <div>Fatalities (best): {c.sumBest.toLocaleString()}</div>
                  <div>Date: {new Date(c.sampleEvent.date_end).toLocaleDateString()}</div>
                  <button
                    className="mt-2 underline text-blue-600"
                    onClick={() => navigate(`/dashboard/${c.sampleEvent.conflict_new_id}?countryId=${countryId}`)}
                  >
                    Open dashboard
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </>
    )
  }

  const conflicts = useMemo(() => {
    const map = new Map<number, { id: number; name: string; events: number; sumBest: number }>()
    for (const e of events) {
      const cur = map.get(e.conflict_new_id) ?? { id: e.conflict_new_id, name: e.conflict_name, events: 0, sumBest: 0 }
      cur.events += 1
      cur.sumBest += Number(e.best || 0)
      map.set(e.conflict_new_id, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.sumBest - a.sumBest)
  }, [events])

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="p-3 border-b text-sm bg-white sticky top-0 z-10">
        <div className="font-semibold">Country · {idNum}</div>
      </header>

      <div className="p-3 grid gap-3">
        <div className="h-[50vh] w-full border rounded overflow-hidden">
          <MapContainer center={[20, 0]} zoom={4} className="h-full w-full" worldCopyJump>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {bounds && <FitBounds b={bounds} />}
            <ClusteredEvents events={events} countryId={idNum} navigate={navigate} />
          </MapContainer>
        </div>

        <div className="">
          <div className="text-sm font-semibold mb-2">Conflicts in country</div>
          <div className="grid gap-2">
            {conflicts.map(c => (
              <div key={c.id} className="flex items-center justify-between border rounded p-2">
                <div>
                  <div className="font-medium text-sm">{c.name}</div>
                  <div className="text-xs text-gray-600">{c.events} events · {c.sumBest.toLocaleString()} fatalities (best)</div>
                </div>
                <button className="text-blue-600 underline text-sm" onClick={() => navigate(`/dashboard/${c.id}?countryId=${idNum}`)}>
                  Open dashboard
                </button>
              </div>
            ))}
            {!conflicts.length && !isLoading && !error && (
              <div className="text-sm text-gray-600">No recent events.</div>
            )}
          </div>
        </div>

        {isLoading && <div className="text-xs text-gray-500">Loading…</div>}
        {error && <div className="text-xs text-red-600">Failed to load country events</div>}
      </div>
    </div>
  )
}
