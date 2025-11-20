import { useQuery } from '@tanstack/react-query'
import { fetchGedEventsPaged, last12MonthWindow, type GedEvent } from '../lib/ucdp'

export type ConflictMeta = {
  conflictName: string | null
  countryId: number | null
}

export function useConflictMeta(conflictId: number, countryId?: number) {
  const { start, end } = last12MonthWindow()
  return useQuery<{ meta: ConflictMeta }, Error>({
    queryKey: ['conflictMeta', conflictId, countryId, start, end],
    enabled: Number.isFinite(conflictId),
    queryFn: async () => {
      const events: GedEvent[] = await fetchGedEventsPaged({
        startDate: start,
        endDate: end,
        countryIds: countryId ? [countryId] : undefined,
        maxPages: 3,
      })
      const first = events.find((e) => e.conflict_new_id === conflictId)
      const meta: ConflictMeta = {
        conflictName: first?.conflict_name ?? null,
        countryId: first?.country_id ?? null,
      }
      return { meta }
    },
    staleTime: 1000 * 60 * 10,
  })
}
