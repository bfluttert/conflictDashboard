import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { useConflictEventsLastYear } from '../hooks/useConflictEvents'

export default function ConflictMapTile({ conflictId, countryId }: { conflictId: number; countryId?: number }) {
  const { data, isLoading, error } = useConflictEventsLastYear(conflictId, countryId)
  const events = data?.events ?? []

  let bounds: [[number, number], [number, number]] | null = null
  if (events.length) {
    let minLat = 90
    let maxLat = -90
    let minLon = 180
    let maxLon = -180
    for (const e of events) {
      if (e.latitude < minLat) minLat = e.latitude
      if (e.latitude > maxLat) maxLat = e.latitude
      if (e.longitude < minLon) minLon = e.longitude
      if (e.longitude > maxLon) maxLon = e.longitude
    }
    bounds = [[minLat, minLon], [maxLat, maxLon]]
  }

  const center: [number, number] = bounds
    ? [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2]
    : [15, 0]

  const maxBest = events.reduce((m, e) => {
    const b = Number(e.best || 0)
    return b > m ? b : m
  }, 0)

  if (isLoading) return <div className="p-3 text-sm">Loading map…</div>
  if (error) return <div className="p-3 text-sm text-red-600">Failed to load map data</div>
  if (!events.length) return <div className="p-3 text-sm">No recent events for this conflict</div>

  return (
    <div className="flex h-full flex-col p-3 text-sm">
      <div className="text-xs text-gray-500 mb-1">Event locations (last 12 months)</div>
      <div className="flex-1 border rounded overflow-hidden">
        <MapContainer center={center} zoom={5} className="h-full w-full" worldCopyJump>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {events.map((e) => {
            const best = Number(e.best || 0)
            const radius = Math.max(3, Math.min(12, Math.sqrt(best + 1)))
            return (
              <CircleMarker
                key={e.id}
                center={[e.latitude, e.longitude]}
                pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.7 }}
                radius={radius}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-semibold">{e.conflict_name}</div>
                    <div>Date: {new Date(e.date_end).toLocaleDateString()}</div>
                    <div>Fatalities (best): {best}</div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>
      <div className="mt-1 text-[10px] text-gray-500">
        Circle size reflects fatalities (best) per event{maxBest > 0 ? `; max event: ${maxBest.toLocaleString()} deaths` : ''}
      </div>
    </div>
  )
}
