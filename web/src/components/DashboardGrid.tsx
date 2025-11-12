import GridLayout, { type Layout, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useCallback, useEffect, useMemo, useState } from 'react'

export type GridItem = {
  i: string
  x: number
  y: number
  w: number
  h: number
  static?: boolean
}

export type DashboardGridProps = {
  conflictId: string
  initialLayout: GridItem[]
  renderItem: (id: string) => React.ReactNode
}

function lsKey(conflictId: string) {
  return `layout:${conflictId}`
}

export function DashboardGrid({ conflictId, initialLayout, renderItem }: DashboardGridProps) {
  const saved = useMemo(() => {
    const raw = localStorage.getItem(lsKey(conflictId))
    if (!raw) return null
    try { return JSON.parse(raw) as GridItem[] } catch { return null }
  }, [conflictId])

  const [layout, setLayout] = useState<GridItem[]>(saved ?? initialLayout)

  useEffect(() => {
    localStorage.setItem(lsKey(conflictId), JSON.stringify(layout))
  }, [conflictId, layout])

  const onLayoutChange = useCallback((l: Layout[]) => {
    // Map RGL layout back to our type
    const mapped: GridItem[] = l.map(it => ({ i: it.i, x: it.x, y: it.y, w: it.w, h: it.h }))
    setLayout(mapped)
  }, [])

  const RGL = WidthProvider(GridLayout)

  return (
    <div className="p-2">
      <RGL
        className="layout"
        cols={12}
        rowHeight={30}
        isDraggable
        isResizable
        onLayoutChange={onLayoutChange}
        layout={layout as Layout[]}
      >
        {layout.map(it => (
          <div key={it.i} className="bg-white border rounded shadow">
            {renderItem(it.i)}
          </div>
        ))}
      </RGL>
    </div>
  )
}

export default DashboardGrid
