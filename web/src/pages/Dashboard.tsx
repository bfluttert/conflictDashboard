import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import DashboardGrid, { type GridItem } from '../components/DashboardGrid'
import NumbersTile from '../tiles/NumbersTile'
import SummaryTile from '../tiles/SummaryTile'
import HistoryTile from '../tiles/HistoryTile'
import ConflictMapTile from '../tiles/ConflictMapTile'
import { useAuth } from '../context/AuthContext'
import { useDashboardLayout } from '../hooks/useDashboardLayout'
import { useConflictMeta } from '../hooks/useConflictMeta'
import { getCountryNameFromId } from '../lib/countryName'

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

  const initialLayout: GridItem[] = useMemo(() => (
    [
      { i: 'numbers', x: 0, y: 0, w: 4, h: 6 },
      { i: 'summary', x: 4, y: 0, w: 5, h: 6 },
      { i: 'history', x: 9, y: 0, w: 3, h: 6 },
      { i: 'map', x: 0, y: 6, w: 6, h: 6 },
    ]
  ), [])

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="p-3 border-b text-sm bg-white text-black sticky top-0 z-10">
        <div className="font-semibold">
          Dashboard · {conflictTitle}
          {countryTitle ? ` (${countryTitle})` : ''}
        </div>
      </header>
      <div className="p-2 text-xs text-gray-500">Debug: conflictId={idNum} countryId={countryId ?? 'n/a'}</div>
      <DashboardGrid
        conflictId={String(idNum)}
        initialLayout={initialLayout}
        overrideLayout={remoteEnabled && remoteLayout ? remoteLayout as unknown as GridItem[] : undefined}
        onPersist={user ? async (l) => { try { await save(l) } catch (e) { /* noop: fallback already persisted locally before */ } } : undefined}
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
          return <div className="p-3 text-sm text-gray-500">Empty</div>
        }}
      />
    </div>
  )
}

export default Dashboard
