import { useConflictNumbers } from '../hooks/useConflictNumbers'

export default function NumbersTile({ conflictId, countryId }: { conflictId: number; countryId?: number }) {
  const { data, isLoading, error } = useConflictNumbers(conflictId, countryId)

  if (isLoading) return <div className="p-3 text-sm">Loading numbers…</div>
  if (error) return <div className="p-3 text-sm text-red-600">Failed to load numbers</div>
  if (!data) return <div className="p-3 text-sm">No data</div>
  const n = data.numbers

  const typeLabels: Record<1 | 2 | 3, string> = {
    1: 'State-based',
    2: 'Non-state',
    3: 'One-sided',
  }

  return (
    <div className="p-3">
      <div className="text-sm text-gray-500">Last 12 months</div>
      <div className="mt-1 text-2xl font-semibold">{n.totalBest.toLocaleString()} fatalities (best)</div>
      <div className="text-sm text-gray-600">{n.totalEvents.toLocaleString()} events</div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        {(Object.keys(n.byType) as Array<'1' | '2' | '3'>).map((k) => {
          const kk = Number(k) as 1 | 2 | 3
          return (
            <div key={k} className="rounded border p-2">
              <div className="text-xs text-gray-500">{typeLabels[kk]}</div>
              <div className="font-medium">{n.byType[kk].toLocaleString()}</div>
            </div>
          )
        })}
      </div>

      <div className="mt-3">
        <div className="text-xs text-gray-500 mb-1">By month (events)</div>
        <div className="flex items-end gap-1 h-16">
          {n.byMonth.map((m) => {
            const height = Math.min(60, 2 + m.events)
            return (
              <div key={m.month} title={`${m.month}: ${m.events} events`} className="bg-blue-500 w-2" style={{ height }} />
            )
          })}
        </div>
      </div>
    </div>
  )
}
