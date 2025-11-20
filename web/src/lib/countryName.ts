import countries from 'world-countries'
import { UCDP_COUNTRY_ISO3 } from './countryIso3Map'

export function getCountryNameFromId(countryId?: number | null): string | null {
  if (!countryId || !Number.isFinite(countryId)) return null
  const iso3 = UCDP_COUNTRY_ISO3[countryId]
  if (!iso3) return null
  const all = (countries as any[]) || []
  const match = all.find((c) => c.cca3 === iso3)
  return match?.name?.common ?? match?.name?.official ?? iso3 ?? null
}
