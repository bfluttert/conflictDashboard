import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import DashboardGrid, { type GridItem } from '../components/DashboardGrid'
import NumbersTile from '../tiles/NumbersTile'
import SummaryTile from '../tiles/SummaryTile'
import HistoryTile from '../tiles/HistoryTile'
import ConflictMapTile from '../tiles/ConflictMapTile'
import FlightTrackingTile from '../tiles/FlightTrackingTile'
import { useAuth } from '../context/AuthContext'
import { useDashboardLayout } from '../hooks/useDashboardLayout'
import { useConflictMeta } from '../hooks/useConflictMeta'
import { getCountryNameFromId } from '../lib/countryName'
import { useDashboard } from '../context/DashboardContext'

function Dashboard() {
  const { conflictId } = useParams()
  const [sp] = useSearchParams()
  const idNum = Number(conflictId)
  const countryId = sp.get('countryId') ? Number(sp.get('countryId')) : undefined
  const { user } = useAuth()
  const { layout: remoteLayout, enabled: remoteEnabled, save } = useDashboardLayout(idNum)
  const { data: metaData } = useConflictMeta(idNum, countryId)
  const conflictTitle = metaData?.meta.conflictName ?? `Conflict ${idNum}`
  const countryTitle = getCountryNameFromId(metaData?.meta.countryId ?? countryId)

  const { activeTileIds } = useDashboard()

  const initialLayout: GridItem[] = useMemo(() => (
    [
      { i: 'numbers', x: 0, y: 0, w: 4, h: 6 },
      { i: 'summary', x: 4, y: 0, w: 5, h: 6 },
      { i: 'history', x: 9, y: 0, w: 3, h: 6 },
      { i: 'map', x: 0, y: 6, w: 6, h: 6 },
      { i: 'flights', x: 6, y: 6, w: 6, h: 6 },
    ]
  ), [])

  return (
    <div className="p-8 pb-32">
      <header className="mb-12 flex items-end justify-between border-b border-white/10 pb-8">
        <div>
          <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-3">
            Sector Analysis
          </div>
          <h1 className="text-5xl font-black text-white leading-none tracking-tighter">
            {conflictTitle}
          </h1>
          {countryTitle && (
            <div className="text-white/40 mt-4 font-bold flex items-center gap-3 text-xs uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-white/20 shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
              {countryTitle}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="text-[9px] font-mono text-white/20 bg-white/[0.02] px-3 py-1 rounded-full border border-white/5">
            CID: {idNum}
          </div>
          <div className="text-[9px] font-mono text-white/20 bg-white/[0.02] px-3 py-1 rounded-full border border-white/5">
            GEOLOC: {countryId ?? 'N/A'}
          </div>
        </div>
      </header>

      <DashboardGrid
        conflictId={String(idNum)}
        initialLayout={initialLayout}
        overrideLayout={remoteEnabled && remoteLayout ? remoteLayout as unknown as GridItem[] : undefined}
        visibleTileIds={activeTileIds}
        onPersist={user ? async (l) => { try { await save(l) } catch (e) { /* noop */ } } : undefined}
        renderItem={(key) => {
          if (key === 'numbers') return <NumbersTile conflictId={idNum} countryId={countryId} />
          if (key === 'summary') {
            return (
              <SummaryTile
                conflictId={idNum}
                countryId={countryId}
                conflictName={conflictTitle}
                countryName={countryTitle}
              />
            )
          }
          if (key === 'history') return <HistoryTile conflictId={idNum} countryId={countryId} />
          if (key === 'map') return <ConflictMapTile conflictId={idNum} countryId={countryId} />
          if (key === 'flights') return <FlightTrackingTile countryId={countryId} />
          return <div className="p-3 text-sm text-gray-500 italic">Empty tile content</div>
        }}
      />
    </div>
  )
}

export default Dashboard
