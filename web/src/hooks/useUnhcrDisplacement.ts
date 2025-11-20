import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type Displacement = {
  iso3: string
  refugees: number
  asylum_seekers: number
  idps?: number
  year?: number
  source?: string
}

export function useUnhcrDisplacement(iso3?: string | null) {
  return useQuery<{ displacement?: Displacement }, Error>({
    queryKey: ['unhcr', 'displacement', iso3?.toUpperCase()],
    enabled: !!iso3,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('unhcr-displacement', {
        body: { iso3: iso3?.toUpperCase() },
      })
      if (error) throw error
      return { displacement: data as Displacement }
    },
    staleTime: 1000 * 60 * 30,
    retry: 1,
  })
}
