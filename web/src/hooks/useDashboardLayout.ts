import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export type GridLayoutItem = { i: string; x: number; y: number; w: number; h: number }

export function useDashboardLayout(conflictId: number) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const enabled = !!user && Number.isFinite(conflictId)

  const layoutQuery = useQuery<{ layout?: GridLayoutItem[] }, Error>({
    queryKey: ['dashboardLayout', user?.id, conflictId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dashboards')
        .select('layout')
        .eq('user_id', user!.id)
        .eq('conflict_id', conflictId)
        .maybeSingle()
      if (error) throw error
      return { layout: (data?.layout as GridLayoutItem[] | undefined) }
    },
    staleTime: 1000 * 60,
  })

  const saveMutation = useMutation({
    mutationFn: async (layout: GridLayoutItem[]) => {
      if (!user) return
      const { error } = await supabase
        .from('dashboards')
        .upsert({
          user_id: user.id,
          conflict_id: conflictId,
          layout,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,conflict_id' })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboardLayout', user?.id, conflictId] })
    },
  })

  return {
    enabled,
    layout: layoutQuery.data?.layout,
    loading: layoutQuery.isLoading,
    error: layoutQuery.error,
    save: async (layout: GridLayoutItem[]) => saveMutation.mutateAsync(layout),
  }
}
