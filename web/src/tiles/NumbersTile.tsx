import { useState, useMemo } from 'react'
import { useConflictNumbers, aggregate } from '../hooks/useConflictNumbers'
import { useCountryIso3 } from '../hooks/useCountryIso3'
import { useUnhcrDisplacement } from '../hooks/useUnhcrDisplacement'
import type { GedEvent } from '../lib/ucdp'

export default function NumbersTile({ conflictId, countryId, events }: { conflictId?: number; countryId?: number; events?: GedEvent[] }) {
  const { data: hookData, isLoading: hookLoading, error } = useConflictNumbers(conflictId, countryId)

  const data = useMemo(() => {
    if (events) return { numbers: aggregate(events) }
    return hookData
  }, [events, hookData])

  const isLoading = !events && hookLoading
  const iso3State = useCountryIso3(countryId ?? NaN)
  const { data: dispData, isLoading: dispLoading } = useUnhcrDisplacement(iso3State.iso3 ?? undefined)

  const [enabledTypes, setEnabledTypes] = useState<Record<1 | 2 | 3, boolean>>({
    1: true,
    2: true,
    3: true,
  })

  if (isLoading) return <div className="p-3 text-sm">Loading numbers…</div>
  if (error && !events) return <div className="p-3 text-sm text-red-600">Failed to load numbers</div>
  if (!data) return <div className="p-3 text-sm">No data</div>
  const n = data.numbers
  const d = dispData?.displacement

  const typeLabels: Record<1 | 2 | 3, string> = {
    1: 'State-based',
    2: 'Non-state',
    3: 'One-sided',
  }
  const typeKeys = Object.keys(n.byType) as Array<'1' | '2' | '3'>
  const selectedBest = typeKeys
    .map((k) => Number(k) as 1 | 2 | 3)
    .filter((kk) => enabledTypes[kk])
    .reduce((sum, kk) => sum + (n.byType[kk] ?? 0), 0)

  return (
    <div className="flex h-full flex-col p-3 overflow-y-auto">
      <div className="text-sm text-gray-500">Last 12 months</div>
      <div className="mt-1 text-2xl font-semibold">{selectedBest.toLocaleString()} fatalities (best)</div>
      <div className="text-sm text-gray-600">
        {n.totalEvents.toLocaleString()} events
        {selectedBest !== n.totalBest && (
          <span className="ml-1 text-xs text-gray-500">
            ({n.totalBest.toLocaleString()} across all types)
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm flex-shrink-0">
        {typeKeys.map((k) => {
          const kk = Number(k) as 1 | 2 | 3
          const active = enabledTypes[kk]
          return (
            <button
              key={k}
              type="button"
              onClick={() =>
                setEnabledTypes((prev) => ({
                  ...prev,
                  [kk]: !prev[kk],
                }))
              }
              className={`rounded border p-2 text-left cursor-pointer transition-colors ${active ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-200 opacity-70'
                }`}
            >
              <div className="text-xs text-gray-500">{typeLabels[kk]}</div>
              <div className="font-medium">{n.byType[kk].toLocaleString()}</div>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex-shrink-0">
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

      {countryId && (
        <div className="mt-4 flex-shrink-0">
          <div className="text-xs text-gray-500 mb-1">Displacement (UNHCR){iso3State.loading || dispLoading ? ' – loading…' : ''}</div>
          {d ? (
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded border p-2">
                <div className="text-xs text-gray-500">Refugees</div>
                <div className="font-medium">{d.refugees.toLocaleString()}</div>
              </div>
              <div className="rounded border p-2">
                <div className="text-xs text-gray-500">Asylum seekers</div>
                <div className="font-medium">{d.asylum_seekers.toLocaleString()}</div>
              </div>
              <div className="rounded border p-2">
                <div className="text-xs text-gray-500">IDPs</div>
                <div className="font-medium">{(d.idps ?? 0).toLocaleString()}</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500">No displacement data available.</div>
          )}
        </div>
      )}
    </div>
  )
}
