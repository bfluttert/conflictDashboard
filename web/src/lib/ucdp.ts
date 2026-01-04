export type GedEvent = {
  id: number
  conflict_new_id: number
  conflict_name: string
  dyad_new_id: number | null
  dyad_name: string | null
  latitude: number
  longitude: number
  date_end: string
  best: number
  type_of_violence: number
  country_id: number
}

export type UcdpPagedResponse<T> = {
  TotalCount: number
  TotalPages: number
  PreviousPageUrl: string | null
  NextPageUrl: string | null
  Result: T[]
}

const BASE = import.meta.env.DEV ? '/ucdp/api' : 'https://ucdpapi.pcr.uu.se/api'
const GED_VERSION = '24.1' // Using 24.1 for stable historical data access

export type GedQuery = {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  countryIds?: number[]
  typeOfViolence?: number[] // 1,2,3
  maxPages?: number // safety cap
}

function buildGedUrl(q: GedQuery, pageSize = 1000, page?: number) {
  const params = new URLSearchParams()
  params.set('pagesize', String(pageSize))
  if (page !== undefined) params.set('page', String(page))
  params.set('StartDate', q.startDate)
  params.set('EndDate', q.endDate)
  if (q.countryIds?.length) params.set('Country', q.countryIds.join(','))
  if (q.typeOfViolence?.length) params.set('TypeOfViolence', q.typeOfViolence.join(','))
  return `${BASE}/gedevents/${GED_VERSION}?${params.toString()}`
}

export async function fetchGedEventsPaged(q: GedQuery): Promise<GedEvent[]> {
  const maxPages = q.maxPages ?? 5
  let url = buildGedUrl(q)
  const out: GedEvent[] = []
  for (let i = 0; i < maxPages; i++) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`UCDP request failed: ${res.status}`)
    const data = (await res.json()) as UcdpPagedResponse<GedEvent>
    if (data.Result && Array.isArray(data.Result)) {
      out.push(...data.Result)
    }
    if (!data.NextPageUrl) break
    url = import.meta.env.DEV
      ? data.NextPageUrl.replace('https://ucdpapi.pcr.uu.se', '/ucdp')
      : data.NextPageUrl
  }
  return out
}

export function last12MonthWindow(today = new Date()): { start: string; end: string } {
  const end = today
  const start = new Date(today)
  start.setFullYear(today.getFullYear() - 1)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { start: fmt(start), end: fmt(end) }
}
