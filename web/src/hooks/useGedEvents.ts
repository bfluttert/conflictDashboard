import { useQuery } from '@tanstack/react-query'
import { fetchGedEventsPaged, last12MonthWindow, type GedEvent } from '../lib/ucdp'

export function useGedEventsLastYear(limitPages = 3) {
  const { start, end } = last12MonthWindow()
  return useQuery<{ events: GedEvent[] } , Error>({
    queryKey: ['ged', 'lastYear', start, end, limitPages],
    queryFn: async () => {
      const events = await fetchGedEventsPaged({ startDate: start, endDate: end, maxPages: limitPages })
      return { events }
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useGedEventsByCountryLastYear(countryId: number, limitPages = 5) {
  const { start, end } = last12MonthWindow()
  return useQuery<{ events: GedEvent[] }, Error>({
    queryKey: ['ged', 'byCountry', countryId, start, end, limitPages],
    enabled: Number.isFinite(countryId),
    queryFn: async () => {
      const events = await fetchGedEventsPaged({ startDate: start, endDate: end, countryIds: [countryId], maxPages: limitPages })
      return { events }
    },
    staleTime: 1000 * 60 * 5,
  })
}
