import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import { useGedEventsLastYear } from '../hooks/useGedEvents'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()
  const { data, isLoading, error } = useGedEventsLastYear(3)

  const events = data?.events ?? []
  const markers = useMemo(() => events.slice(0, 3000), [events])

  return (
    <div className="h-screen w-screen">
      <MapContainer center={[20, 0]} zoom={2} className="h-full w-full" worldCopyJump>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {markers.map((e) => (
          <CircleMarker
            key={e.id}
            center={[e.latitude, e.longitude]}
            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.6 }}
            radius={Math.max(3, Math.min(10, Math.sqrt((e.best || 0) + 1)))}
            eventHandlers={{
              click: () => navigate(`/dashboard/${e.conflict_new_id}?countryId=${e.country_id}`),
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{e.conflict_name}</div>
                <div>Date: {new Date(e.date_end).toLocaleDateString()}</div>
                <div>Fatalities (best): {e.best}</div>
                <button
                  className="mt-2 underline text-blue-600"
                  onClick={() => navigate(`/dashboard/${e.conflict_new_id}?countryId=${e.country_id}`)}
                >
                  Open dashboard
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
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
