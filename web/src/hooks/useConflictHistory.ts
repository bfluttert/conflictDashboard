import { useQuery } from '@tanstack/react-query'
import { fetchGedEventsPaged, type GedEvent } from '../lib/ucdp'

export type YearHistory = {
  year: number
  totalBest: number
  byType: Record<1 | 2 | 3, number>
}

export function aggregateHistory(events: GedEvent[]): YearHistory[] {
  const byYear = new Map<number, { totalBest: number; byType: Record<1 | 2 | 3, number> }>()

  for (const e of events) {
    const d = new Date(e.date_end)
    const year = d.getUTCFullYear()
    if (!Number.isFinite(year)) continue
    const best = Number(e.best ?? 0) || 0
    const tov = (e.type_of_violence as 1 | 2 | 3) ?? 1

    const cur =
      byYear.get(year) ?? {
        totalBest: 0,
        byType: { 1: 0, 2: 0, 3: 0 },
      }
    cur.totalBest += best
    cur.byType[tov] = (cur.byType[tov] || 0) + best
    byYear.set(year, cur)
  }

  return Array.from(byYear.entries())
    .map(([year, v]) => ({ year, totalBest: v.totalBest, byType: v.byType }))
    .sort((a, b) => a.year - b.year)
}

export function useConflictHistory(conflictId?: number, countryId?: number) {
  return useQuery<{ years: YearHistory[] }, Error>({
    queryKey: ['conflictHistory', conflictId, countryId],
    enabled: Number.isFinite(conflictId) || Number.isFinite(countryId),
    queryFn: async () => {
      const end = new Date()
      const start = new Date(1989, 0, 1)
      const fmt = (d: Date) => d.toISOString().slice(0, 10)

      const events = await fetchGedEventsPaged({
        startDate: fmt(start),
        endDate: fmt(end),
        countryIds: countryId ? [countryId] : undefined,
        maxPages: 20,
      })

      const filtered = (conflictId && Number.isFinite(conflictId))
        ? events.filter((e) => e.conflict_new_id === conflictId)
        : events

      const years = aggregateHistory(filtered)
      return { years }
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}
