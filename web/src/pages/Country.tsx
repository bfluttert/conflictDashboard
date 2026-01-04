import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import DashboardGrid, { type GridItem } from '../components/DashboardGrid'
import NumbersTile from '../tiles/NumbersTile'
import SummaryTile from '../tiles/SummaryTile'
import HistoryTile from '../tiles/HistoryTile'
import ConflictMapTile from '../tiles/ConflictMapTile'
import FlightTrackingTile from '../tiles/FlightTrackingTile'
import { useGedEventsByCountryLastYear } from '../hooks/useGedEvents'
import { useAuth } from '../context/AuthContext'
import { useDashboardLayout } from '../hooks/useDashboardLayout'
import { useDashboard } from '../context/DashboardContext'
import { getCountryNameFromId } from '../lib/countryName'

export default function Country() {
  const { countryId } = useParams()
  const idNum = Number(countryId)
  const { user } = useAuth()
  const { activeTileIds } = useDashboard()

  const countryName = useMemo(() => getCountryNameFromId(idNum) ?? `Country ${idNum}`, [idNum])

  const { data: eventsData } = useGedEventsByCountryLastYear(idNum)
  const events = eventsData?.events ?? []

  const [selectedConflictId, setSelectedConflictId] = useState<number | null>(null)

  const conflicts = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>()
    for (const e of events) {
      if (!map.has(e.conflict_new_id)) {
        map.set(e.conflict_new_id, { id: e.conflict_new_id, name: e.conflict_name })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [events])

  const { layout: remoteLayout, enabled: remoteEnabled, save } = useDashboardLayout(idNum)

  const initialLayout: GridItem[] = useMemo(() => (
    [
      { i: 'numbers', x: 0, y: 0, w: 4, h: 6 },
      { i: 'summary', x: 4, y: 0, w: 5, h: 6 },
      { i: 'history', x: 9, y: 0, w: 3, h: 6 },
      { i: 'map', x: 0, y: 6, w: 6, h: 6 },
      { i: 'flights', x: 6, y: 6, w: 6, h: 6 },
    ]
  ), [])

  const selectedConflictName = conflicts.find(c => c.id === selectedConflictId)?.name

  return (
    <div className="p-8 pb-32 relative z-10">
      <header className="mb-10 border-b border-white/10 pb-6 flex flex-col gap-6">
        <div>
          <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-2">National Intelligence</div>
          <h1 className="text-5xl font-black text-white leading-none tracking-tighter">
            {countryName}
          </h1>
        </div>

        <div className="flex items-center gap-4 bg-white/[0.03] px-5 py-3 rounded-[20px] border border-white/10 backdrop-blur-xl max-w-xl shadow-2xl">
          <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.1em] whitespace-nowrap">Conflict Focus</label>
          <select
            className="border-none p-0 text-[13px] bg-transparent focus:ring-0 outline-none flex-1 font-bold text-white/70 cursor-pointer"
            value={selectedConflictId ?? ''}
            onChange={(e) => {
              const val = e.target.value
              setSelectedConflictId(val ? Number(val) : null)
            }}
          >
            <option value="" className="bg-[#1a1c1e]">Aggregated National Overview</option>
            {conflicts.map(c => (
              <option key={c.id} value={c.id} className="bg-[#1a1c1e]">{c.name}</option>
            ))}
          </select>
          {selectedConflictId && (
            <button
              onClick={() => setSelectedConflictId(null)}
              className="text-[9px] text-white/30 hover:text-white/60 font-black px-3 py-1 border border-white/10 rounded-lg transition-all"
            >
              RESET
            </button>
          )}
        </div>
      </header>

      <DashboardGrid
        conflictId={String(idNum)}
        initialLayout={initialLayout}
        overrideLayout={remoteEnabled && remoteLayout ? remoteLayout as unknown as GridItem[] : undefined}
        visibleTileIds={activeTileIds}
        onPersist={user ? async (l) => { try { await save(l) } catch (e) { /* noop */ } } : undefined}
        renderItem={(key) => {
          const filteredEvents = selectedConflictId
            ? events.filter(e => e.conflict_new_id === selectedConflictId)
            : events

          if (key === 'numbers') return <NumbersTile conflictId={selectedConflictId ?? undefined} countryId={idNum} events={filteredEvents} />
          if (key === 'summary') {
            return (
              <SummaryTile
                conflictId={selectedConflictId ?? undefined}
                countryId={idNum}
                conflictName={selectedConflictName}
                countryName={countryName}
              />
            )
          }
          if (key === 'history') return <HistoryTile conflictId={selectedConflictId ?? undefined} countryId={idNum} />
          if (key === 'map') return <ConflictMapTile conflictId={selectedConflictId ?? undefined} countryId={idNum} events={filteredEvents} />
          if (key === 'flights') return <FlightTrackingTile countryId={idNum} events={filteredEvents} />
          return <div className="p-3 text-sm text-gray-500 italic">Empty tile content</div>
        }}
      />
    </div>
  )
}
