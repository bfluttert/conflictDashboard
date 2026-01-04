import countries from 'world-countries'
import { UCDP_COUNTRY_ISO3 } from './countryIso3Map'

export interface CountryCoords {
    lat: number
    lng: number
    area: number // to estimate radius
}

export function getCountryCoords(countryId?: number | null): CountryCoords | null {
    if (!countryId || !Number.isFinite(countryId)) return null
    const iso3 = UCDP_COUNTRY_ISO3[countryId]
    if (!iso3) return null
    const all = (countries as any[]) || []
    const match = all.find((c) => c.cca3 === iso3)
    if (!match) return null

    return {
        lat: match.latlng[0],
        lng: match.latlng[1],
        area: match.area
    }
}

/**
 * Estimates a radius in nautical miles based on country area in square km.
 * Area = pi * r^2  => r = sqrt(Area/pi) km
 * 1 km = 0.539957 nm
 */
export function estimateRadius(area: number): number {
    const rKm = Math.sqrt(area / Math.PI)
    return rKm * 0.539957
}
