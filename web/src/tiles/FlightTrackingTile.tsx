import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet'
import L from 'leaflet'
import { useFlightData } from '../hooks/useFlightData'
import { getCountryCoords, estimateRadius } from '../lib/countryCoords'

// SVG for aircraft icon
const AIRCRAFT_SVG = `
<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="transform: rotate({track}deg);">
  <path d="M21,16L21,14L13,9L13,3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z" />
</svg>
`

function MapInteraction() {
    const map = useMap()
    const [showWarning, setShowWarning] = useState(false)

    useEffect(() => {
        map.dragging.disable()
        map.scrollWheelZoom.disable()

        const container = map.getContainer()

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

        const onInteractAttempt = (e: Event) => {
            if (!(e as KeyboardEvent | MouseEvent).ctrlKey) {
                setShowWarning(true)
                setTimeout(() => setShowWarning(false), 2000)
            }
        }

        container.addEventListener('mousedown', onInteractAttempt, { capture: true })
        container.addEventListener('wheel', onInteractAttempt, { capture: true })

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

function MapBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
    const map = useMap()
    useEffect(() => {
        if (bounds) {
            map.fitBounds(bounds, { padding: [20, 20] })
        }
    }, [map, bounds])
    return null
}

export default function FlightTrackingTile({ countryId, events }: { countryId?: number; events?: any[] }) {
    const countryCoords = useMemo(() => getCountryCoords(countryId), [countryId])

    const geoInfo = useMemo(() => {
        if (events && events.length > 0) {
            let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180
            events.forEach(e => {
                if (e.latitude < minLat) minLat = e.latitude
                if (e.latitude > maxLat) maxLat = e.latitude
                if (e.longitude < minLon) minLon = e.longitude
                if (e.longitude > maxLon) maxLon = e.longitude
            })
            const center: [number, number] = [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
            // Use Haversine or simple approximation for radius
            const latDist = (maxLat - minLat) * 60 // 60nm per degree
            const lonDist = (maxLon - minLon) * 60 * Math.cos(center[0] * Math.PI / 180)
            const radius = Math.max(latDist, lonDist) / 2 + 50 // add buffer
            return { center, radius, bounds: [[minLat, minLon], [maxLat, maxLon]] as L.LatLngBoundsExpression }
        } else if (countryCoords) {
            const radius = estimateRadius(countryCoords.area) + 50
            return {
                center: [countryCoords.lat, countryCoords.lng] as [number, number],
                radius,
                bounds: null
            }
        }
        return { center: [0, 0] as [number, number], radius: 250, bounds: null }
    }, [events, countryCoords])

    const { data, isLoading, error } = useFlightData(geoInfo.center[0], geoInfo.center[1], geoInfo.radius)

    const createAircraftIcon = (track: number = 0) => {
        return L.divIcon({
            html: AIRCRAFT_SVG.replace('{track}', track.toString()),
            className: 'aircraft-icon',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
        })
    }

    return (
        <div className="flex h-full flex-col p-3 text-sm relative">
            <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-gray-500">Live Flight Tracking (adsb.lol)</div>
                {isLoading && <div className="text-[10px] text-blue-400 animate-pulse uppercase font-bold tracking-widest">Updating...</div>}
            </div>
            <div className="flex-1 border border-white/10 rounded-2xl overflow-hidden relative">
                <MapContainer
                    center={geoInfo.center}
                    zoom={5}
                    className="h-full w-full bg-[#0a0a0a]"
                    worldCopyJump
                >
                    <MapInteraction />
                    {geoInfo.bounds && <MapBounds bounds={geoInfo.bounds} />}

                    <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="Dark Matter">
                            <TileLayer
                                attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors &copy; <a href='https://carto.com/attributions'>CARTO</a>"
                                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="OpenStreetMap">
                            <TileLayer
                                attribution="&copy; OpenStreetMap contributors"
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                        </LayersControl.BaseLayer>
                    </LayersControl>

                    {data?.ac.map((ac) => (
                        ac.lat && ac.lon && (
                            <Marker
                                key={ac.hex}
                                position={[ac.lat, ac.lon]}
                                icon={createAircraftIcon(ac.track)}
                            >
                                <Popup>
                                    <div className="text-xs text-gray-100 p-1">
                                        <div className="font-bold text-sm mb-1 text-blue-400">{ac.flight?.trim() || ac.hex.toUpperCase()}</div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                            <span className="text-gray-500 uppercase text-[9px] font-black tracking-widest">Type</span>
                                            <span className="font-mono">{ac.type || 'N/A'}</span>
                                            <span className="text-gray-500 uppercase text-[9px] font-black tracking-widest">Altitude</span>
                                            <span className="font-mono">{ac.alt_baro} ft</span>
                                            <span className="text-gray-500 uppercase text-[9px] font-black tracking-widest">Speed</span>
                                            <span className="font-mono">{ac.gs} kt</span>
                                            <span className="text-gray-500 uppercase text-[9px] font-black tracking-widest">Reg</span>
                                            <span className="font-mono">{ac.registration || 'N/A'}</span>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        )
                    ))}
                </MapContainer>
                {error && (
                    <div className="absolute bottom-2 left-2 right-2 bg-red-900/80 text-white text-[10px] p-2 rounded backdrop-blur-md border border-red-500/50 z-[1000]">
                        {error}
                    </div>
                )}
            </div>
            <div className="mt-2 text-[9px] text-gray-500 flex justify-between uppercase tracking-widest font-bold">
                <span>Total tracked: {data?.total || 0}</span>
                <span>Radius: {Math.round(geoInfo.radius)}nm</span>
            </div>
            <style>{`
        .aircraft-icon {
          color: #60a5fa;
          filter: drop-shadow(0 0 4px rgba(96, 165, 250, 0.5));
          transition: all 0.5s ease-in-out;
        }
        .aircraft-icon:hover {
          color: #ffffff;
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
          z-index: 1000 !important;
        }
        .leaflet-popup-content-wrapper {
          background: rgba(13, 14, 18, 0.9) !important;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px !important;
          color: white !important;
        }
        .leaflet-popup-tip {
          background: rgba(13, 14, 18, 0.9) !important;
        }
      `}</style>
        </div>
    )
}
