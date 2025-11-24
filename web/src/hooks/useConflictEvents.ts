import { useQuery } from '@tanstack/react-query'
import { fetchGedEventsPaged, last12MonthWindow, type GedEvent } from '../lib/ucdp'

export function useConflictEventsLastYear(conflictId?: number, countryId?: number, maxPages = 10) {
  const { start, end } = last12MonthWindow()
  return useQuery<{ events: GedEvent[] }, Error>({
    queryKey: ['conflictEvents', conflictId, countryId, start, end, maxPages],
    enabled: Number.isFinite(conflictId) || Number.isFinite(countryId),
    queryFn: async () => {
      const events = await fetchGedEventsPaged({
        startDate: start,
        endDate: end,
        countryIds: countryId ? [countryId] : undefined,
        maxPages,
      })
      const filtered = (conflictId && Number.isFinite(conflictId))
        ? events.filter((e) => e.conflict_new_id === conflictId)
        : events
      return { events: filtered }
    },
    staleTime: 1000 * 60 * 10,
  })
}
