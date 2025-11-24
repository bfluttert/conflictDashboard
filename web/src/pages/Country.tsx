import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import DashboardGrid, { type GridItem } from '../components/DashboardGrid'
import NumbersTile from '../tiles/NumbersTile'
import SummaryTile from '../tiles/SummaryTile'
import HistoryTile from '../tiles/HistoryTile'
import ConflictMapTile from '../tiles/ConflictMapTile'
import { useGedEventsByCountryLastYear } from '../hooks/useGedEvents'
import { useAuth } from '../context/AuthContext'
import { useDashboardLayout } from '../hooks/useDashboardLayout'

export default function Country() {
  const { countryId } = useParams()
  const idNum = Number(countryId)
  const { user } = useAuth()

  // We use this hook to get the list of conflicts for the selector
  const { data: eventsData } = useGedEventsByCountryLastYear(idNum)
  const events = eventsData?.events ?? []

  const [selectedConflictId, setSelectedConflictId] = useState<number | null>(null)

  // Derive unique conflicts from events
  const conflicts = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>()
    for (const e of events) {
      if (!map.has(e.conflict_new_id)) {
        map.set(e.conflict_new_id, { id: e.conflict_new_id, name: e.conflict_name })
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [events])

  const { layout: remoteLayout, enabled: remoteEnabled, save } = useDashboardLayout(idNum) // Use countryId for layout persistence key? Or maybe a separate key.
  // Currently useDashboardLayout uses the ID passed to it. If we pass countryId, it saves for the country.
  // If we want different layouts for country vs conflict, we might need to change this.
  // For now, let's share the layout for the country page.

  const initialLayout: GridItem[] = useMemo(() => (
    [
      { i: 'numbers', x: 0, y: 0, w: 4, h: 6 },
      { i: 'summary', x: 4, y: 0, w: 5, h: 6 },
      { i: 'history', x: 9, y: 0, w: 3, h: 6 },
      { i: 'map', x: 0, y: 6, w: 6, h: 6 },
    ]
  ), [])

  const selectedConflictName = conflicts.find(c => c.id === selectedConflictId)?.name

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="p-3 border-b text-sm bg-white sticky top-0 z-10 flex items-center gap-4">
        <div className="font-semibold">Country · {idNum}</div>

        <select
          className="border rounded p-1 text-sm max-w-xs"
          value={selectedConflictId ?? ''}
          onChange={(e) => {
            const val = e.target.value
            setSelectedConflictId(val ? Number(val) : null)
          }}
        >
          <option value="">All Conflicts (Country Overview)</option>
          {conflicts.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </header>

      <div className="p-2 text-xs text-gray-500">
        Debug: countryId={idNum} conflictId={selectedConflictId ?? 'null'}
      </div>

      <DashboardGrid
        conflictId={String(idNum)} // Using countryId as the key for the grid layout for now
        initialLayout={initialLayout}
        overrideLayout={remoteEnabled && remoteLayout ? remoteLayout as unknown as GridItem[] : undefined}
        onPersist={user ? async (l) => { try { await save(l) } catch (e) { /* noop */ } } : undefined}
        renderItem={(key) => {
          // Filter events for the selected conflict, or use all events if none selected
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
                countryName={`Country ${idNum}`}
              />
            )
          }
          if (key === 'history') return <HistoryTile conflictId={selectedConflictId ?? undefined} countryId={idNum} />
          if (key === 'map') return <ConflictMapTile conflictId={selectedConflictId ?? undefined} countryId={idNum} events={filteredEvents} />
          return <div className="p-3 text-sm text-gray-500">Empty</div>
        }}
      />
    </div>
  )
}
