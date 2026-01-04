import { useState, useEffect } from 'react'

export interface Aircraft {
    hex: string
    flight?: string
    lat?: number
    lon?: number
    alt_baro?: number | string
    gs?: number
    track?: number
    type?: string
    registration?: string
}

export interface FlightDataResponse {
    ac: Aircraft[]
    total: number
    now: number
}

export function useFlightData(lat: number, lon: number, radius: number) {
    const [data, setData] = useState<FlightDataResponse | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (lat === 0 && lon === 0) return

        let isMounted = true
        const fetchData = async () => {
            setIsLoading(true)
            try {
                // Radius is capped at 250nm by the API
                const safeRadius = Math.min(250, Math.max(1, Math.round(radius)))
                const response = await fetch(`https://api.adsb.lol/v2/lat/${lat}/lon/${lon}/dist/${safeRadius}`)
                if (!response.ok) throw new Error('Failed to fetch flight data')
                const json = await response.json()
                if (isMounted) {
                    setData(json)
                    setError(null)
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'Unknown error')
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        fetchData()
        const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds

        return () => {
            isMounted = false
            clearInterval(interval)
        }
    }, [lat, lon, radius])

    return { data, isLoading, error }
}
