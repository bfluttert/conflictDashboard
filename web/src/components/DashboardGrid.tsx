import GridLayout, { type Layout, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import React, { useCallback, useMemo, useRef } from 'react'

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
  overrideLayout?: GridItem[]
  onPersist?: (layout: GridItem[]) => void
  visibleTileIds?: string[]
}

const CustomResizeHandle = React.forwardRef(({ handleAxis, ...rest }: any, ref: any) => (
  <div
    ref={ref}
    className={`absolute bottom-1 right-1 cursor-se-resize p-1.5 group/handle active:scale-90 transition-all z-50 no-drag ${rest.className || ''}`}
    style={{ ...rest.style }}
    onMouseDown={rest.onMouseDown}
    onMouseUp={rest.onMouseUp}
    onTouchEnd={rest.onTouchEnd}
  >
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-white/5 group-hover/handle:text-white/40 group-hover:text-white/30 transition-colors duration-500">
      <path d="M4 14L14 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M9 14L14 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M13 14L14 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  </div>
))

function lsKey(conflictId: string) {
  return `layout:${conflictId}`
}

export function DashboardGrid({ conflictId, initialLayout, renderItem, overrideLayout, onPersist, visibleTileIds }: DashboardGridProps) {
  const saved = useMemo(() => {
    const raw = localStorage.getItem(lsKey(conflictId))
    if (!raw) return null
    try { return JSON.parse(raw) as GridItem[] } catch { return null }
  }, [conflictId])

  const effectiveLayout = useMemo(() => {
    const base = overrideLayout ?? saved ?? initialLayout
    const ids = new Set(base.map(it => it.i))
    const missing = initialLayout.filter(it => !ids.has(it.i))
    const combined = missing.length ? [...base, ...missing] : base

    if (visibleTileIds) {
      const visibleSet = new Set(visibleTileIds)
      return combined.filter(it => visibleSet.has(it.i))
    }
    return combined
  }, [overrideLayout, saved, initialLayout, visibleTileIds])

  const lastSavedJson = useRef<string | null>(null)
  const onLayoutChange = useCallback((l: Layout[]) => {
    const mapped: GridItem[] = l.map(it => ({ i: it.i, x: it.x, y: it.y, w: it.w, h: it.h }))
    const json = JSON.stringify(mapped)
    if (lastSavedJson.current === json) return
    lastSavedJson.current = json
    if (onPersist) {
      onPersist(mapped)
    } else {
      localStorage.setItem(lsKey(conflictId), json)
    }
  }, [conflictId, onPersist])

  const RGL = WidthProvider(GridLayout)

  return (
    <div className="p-4 relative">
      <RGL
        className="layout"
        cols={12}
        rowHeight={30}
        isDraggable
        isResizable
        draggableCancel=".no-drag"
        onLayoutChange={onLayoutChange}
        margin={[20, 20]}
        resizeHandle={<CustomResizeHandle />}
      >
        {effectiveLayout.map(it => (
          <div
            key={it.i}
            data-grid={it}
            className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[28px] shadow-2xl overflow-hidden hover:bg-white/[0.05] transition-colors duration-500 group"
          >
            <div className="flex-1 h-full overflow-hidden">
              {renderItem(it.i)}
            </div>
          </div>
        ))}
      </RGL>
    </div>
  )
}

export default DashboardGrid
