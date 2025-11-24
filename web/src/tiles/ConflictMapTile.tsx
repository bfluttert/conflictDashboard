import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl, useMap } from 'react-leaflet'
import { useConflictEventsLastYear } from '../hooks/useConflictEvents'
import type { GedEvent } from '../lib/ucdp'

function MapInteraction() {
  const map = useMap()
  const [showWarning, setShowWarning] = useState(false)

  useEffect(() => {
    map.dragging.disable()
    map.scrollWheelZoom.disable()

    const container = map.getContainer()

    // We need to stop propagation of mousedown to prevent grid dragging when we want to interact with map
    // But actually, we want grid dragging by default.
    // When Ctrl is pressed, we add 'no-drag' class to container.

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        map.dragging.enable()
        map.scrollWheelZoom.enable()
        container.style.cursor = 'grab'
        container.classList.add('no-drag')
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        map.dragging.disable()
        map.scrollWheelZoom.disable()
        container.style.cursor = 'default'
        container.classList.remove('no-drag')
      }
    }

    // Detect attempts to interact without Ctrl
    const onInteractAttempt = (e: Event) => {
      if (!(e as KeyboardEvent | MouseEvent).ctrlKey) {
        setShowWarning(true)
        setTimeout(() => setShowWarning(false), 2000)
      }
    }

    // We attach listeners to the container to catch interactions
    // Note: Leaflet stops propagation on some events, so we might need capture phase
    container.addEventListener('mousedown', onInteractAttempt, { capture: true })
    container.addEventListener('wheel', onInteractAttempt, { capture: true })
    // Also touch events? For now just mouse.

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      container.removeEventListener('mousedown', onInteractAttempt, { capture: true })
      container.removeEventListener('wheel', onInteractAttempt, { capture: true })

      map.dragging.enable()
      map.scrollWheelZoom.enable()
      container.classList.remove('no-drag')
    }
  }, [map])

  return (
    <>
      {showWarning && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/50 pointer-events-none transition-opacity">
          <div className="text-white font-semibold text-lg bg-black/70 px-4 py-2 rounded">
            Use Ctrl + Pan to move map
          </div>
        </div>
      )}
    </>
  )
}

export default function ConflictMapTile({ conflictId, countryId, events: propEvents }: { conflictId?: number; countryId?: number; events?: GedEvent[] }) {
  const { data, isLoading: hookLoading, error } = useConflictEventsLastYear(conflictId, countryId)
  const events = propEvents ?? data?.events ?? []
  const isLoading = !propEvents && hookLoading

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
    <div className="flex h-full flex-col p-3 text-sm relative">
      <div className="text-xs text-gray-500 mb-1">Event locations (last 12 months)</div>
      <div className="flex-1 border rounded overflow-hidden relative">
        <MapContainer center={center} zoom={5} className="h-full w-full" worldCopyJump>
          <MapInteraction />
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            <LayersControl.Overlay name="Precipitation">
              <TileLayer
                url={`https://api.tomorrow.io/v4/map/tile/{z}/{x}/{y}/precipitationIntensity/now.png?apikey=${import.meta.env.VITE_TOMORROW_IO_API_KEY}`}
                attribution="&copy; Tomorrow.io"
              />
            </LayersControl.Overlay>
            <LayersControl.Overlay name="Clouds">
              <TileLayer
                url={`https://api.tomorrow.io/v4/map/tile/{z}/{x}/{y}/cloudCover/now.png?apikey=${import.meta.env.VITE_TOMORROW_IO_API_KEY}`}
                attribution="&copy; Tomorrow.io"
              />
            </LayersControl.Overlay>
            <LayersControl.Overlay name="Pressure">
              <TileLayer
                url={`https://api.tomorrow.io/v4/map/tile/{z}/{x}/{y}/pressureSeaLevel/now.png?apikey=${import.meta.env.VITE_TOMORROW_IO_API_KEY}`}
                attribution="&copy; Tomorrow.io"
              />
            </LayersControl.Overlay>
            <LayersControl.Overlay name="Temperature">
              <TileLayer
                url={`https://api.tomorrow.io/v4/map/tile/{z}/{x}/{y}/temperature/now.png?apikey=${import.meta.env.VITE_TOMORROW_IO_API_KEY}`}
                attribution="&copy; Tomorrow.io"
              />
            </LayersControl.Overlay>
            <LayersControl.Overlay name="Wind Speed">
              <TileLayer
                url={`https://api.tomorrow.io/v4/map/tile/{z}/{x}/{y}/windSpeed/now.png?apikey=${import.meta.env.VITE_TOMORROW_IO_API_KEY}`}
                attribution="&copy; Tomorrow.io"
              />
            </LayersControl.Overlay>
          </LayersControl>

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
