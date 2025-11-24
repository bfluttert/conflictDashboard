import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type ConflictSummary = {
  summary: string
  model: string
  cached: boolean
}

export function useConflictSummary(
  conflictId?: number,
  countryId?: number,
  meta?: { conflictName?: string | null; countryName?: string | null },
) {
  return useQuery<ConflictSummary, Error>({
    queryKey: ['conflictSummary', conflictId, countryId],
    enabled: Number.isFinite(conflictId) || Number.isFinite(countryId),
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('conflict-summary', {
        body: {
          conflictId,
          countryId,
          conflictName: meta?.conflictName ?? undefined,
          countryName: meta?.countryName ?? undefined,
        },
      })
      if (error) throw error
      return data as ConflictSummary
    },
    staleTime: 1000 * 60 * 60, // 1 hour in browser cache
  })
}
