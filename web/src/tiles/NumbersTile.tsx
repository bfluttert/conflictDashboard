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
    <div className="flex h-full flex-col p-6 overflow-y-auto">
      <div className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
        Temporal Metrics
      </div>
      <div className="mt-1 text-4xl font-black text-white tracking-tighter tabular-nums drop-shadow-lg">
        {selectedBest.toLocaleString()}
      </div>
      <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mt-1 flex items-center gap-2">
        Fatalities (Verified)
        {selectedBest !== n.totalBest && (
          <span className="text-[9px] text-white/20 font-mono">
            / FROM {n.totalBest.toLocaleString()} TOTAL
          </span>
        )}
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 text-sm flex-shrink-0">
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
              className={`rounded-2xl border p-4 text-left cursor-pointer transition-all duration-300 backdrop-blur-md ${active
                ? 'bg-blue-600/20 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)] scale-[1.02]'
                : 'bg-white/[0.02] border-white/5 opacity-40 hover:opacity-100 hover:bg-white/[0.05]'
                }`}
            >
              <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">{typeLabels[kk]}</div>
              <div className={`font-black text-lg tabular-nums ${active ? 'text-blue-400' : 'text-white/60'}`}>
                {n.byType[kk].toLocaleString()}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-10 flex-shrink-0">
        <div className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-4">Event Frequency // Monthly</div>
        <div className="flex items-end gap-2 h-20 bg-white/[0.02] p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
          {n.byMonth.map((m) => {
            const height = Math.max(8, Math.min(60, 2 + (m.events * 2)))
            return (
              <div
                key={m.month}
                title={`${m.month}: ${m.events} events`}
                className="bg-blue-500/60 hover:bg-blue-400 w-full rounded-t-sm transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                style={{ height }}
              />
            )
          })}
        </div>
      </div>

      {countryId && (
        <div className="mt-10 flex-shrink-0">
          <div className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            Displacement Vectors // UNHCR
            {iso3State.loading || dispLoading ? <div className="w-1 h-1 rounded-full bg-white/40 animate-ping" /> : ''}
          </div>
          {d ? (
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md">
                <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">Refugees</div>
                <div className="font-black text-white/80 tabular-nums">{d.refugees.toLocaleString()}</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md">
                <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">Asylum Select</div>
                <div className="font-black text-white/80 tabular-nums">{d.asylum_seekers.toLocaleString()}</div>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md">
                <div className="text-[9px] text-white/30 font-black uppercase tracking-widest mb-1">Internal Displ.</div>
                <div className="font-black text-white/80 tabular-nums">{(d.idps ?? 0).toLocaleString()}</div>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-white/20 font-mono italic">DATA UNAVAILABLE FOR REGION</div>
          )}
        </div>
      )}
    </div>
  )
}
