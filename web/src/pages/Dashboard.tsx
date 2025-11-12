import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import DashboardGrid, { type GridItem } from '../components/DashboardGrid'
import NumbersTile from '../tiles/NumbersTile'

function Dashboard() {
  const { conflictId } = useParams()
  const [sp] = useSearchParams()
  const idNum = Number(conflictId)
  const countryId = sp.get('countryId') ? Number(sp.get('countryId')) : undefined

  const initialLayout: GridItem[] = useMemo(() => (
    [
      { i: 'numbers', x: 0, y: 0, w: 4, h: 6 },
    ]
  ), [])

  return (
    <div className="min-h-screen bg-white text-black">
      <header className="p-3 border-b text-sm bg-white text-black sticky top-0 z-10">
        <div className="font-semibold">Dashboard · Conflict {idNum}</div>
      </header>
      <div className="p-2 text-xs text-gray-500">Debug: conflictId={idNum} countryId={countryId ?? 'n/a'}</div>
      <DashboardGrid
        conflictId={String(idNum)}
        initialLayout={initialLayout}
        renderItem={(key) => {
          if (key === 'numbers') return <NumbersTile conflictId={idNum} countryId={countryId} />
          return <div className="p-3 text-sm text-gray-500">Empty</div>
        }}
      />
    </div>
  )
}

export default Dashboard
