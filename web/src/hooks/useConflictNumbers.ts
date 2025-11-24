import { useQuery } from '@tanstack/react-query'
import { fetchGedEventsPaged, last12MonthWindow, type GedEvent } from '../lib/ucdp'

export type ConflictNumbers = {
  totalEvents: number
  totalBest: number
  byType: Record<1 | 2 | 3, number>
  byMonth: { month: string; events: number; best: number }[]
}

export function aggregate(events: GedEvent[]): ConflictNumbers {
  const byType: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 }
  const byMonthMap = new Map<string, { events: number; best: number }>()
  let totalBest = 0

  for (const e of events) {
    const tov = (e.type_of_violence as 1 | 2 | 3) ?? 1
    const best = Number(e.best ?? 0) || 0
    totalBest += best
    byType[tov] = (byType[tov] || 0) + best
    const m = new Date(e.date_end)
      .toISOString()
      .slice(0, 7)
    const cur = byMonthMap.get(m) ?? { events: 0, best: 0 }
    cur.events += 1
    cur.best += best
    byMonthMap.set(m, cur)
  }

  const byMonth = Array.from(byMonthMap.entries())
    .map(([month, v]) => ({ month, events: v.events, best: v.best }))
    .sort((a, b) => (a.month < b.month ? -1 : 1))

  return {
    totalEvents: events.length,
    totalBest,
    byType,
    byMonth,
  }
}

export function useConflictNumbers(conflictId?: number, countryId?: number) {
  const { start, end } = last12MonthWindow()
  return useQuery<{ numbers: ConflictNumbers }, Error>({
    queryKey: ['conflictNumbers', conflictId, countryId, start, end],
    enabled: Number.isFinite(conflictId) || Number.isFinite(countryId),
    queryFn: async () => {
      const events = await fetchGedEventsPaged({
        startDate: start,
        endDate: end,
        countryIds: countryId ? [countryId] : undefined,
        maxPages: 10,
      })
      // If conflictId is provided, filter. Otherwise use all events (for country).
      const filtered = (conflictId && Number.isFinite(conflictId))
        ? events.filter((e) => e.conflict_new_id === conflictId)
        : events

      const numbers = aggregate(filtered)
      return { numbers }
    },
    staleTime: 1000 * 60 * 10,
  })
}
