import { clsx } from 'clsx'
import { type ReactNode } from 'react'

export type SidebarProps = {
  availableTiles: { id: string; label: string; icon: ReactNode }[]
  activeTileIds: string[]
  onToggleTile: (id: string) => void
  isCollapsed: boolean
  onToggleSidebar: () => void
}

export function Sidebar({ availableTiles, activeTileIds, onToggleTile, isCollapsed, onToggleSidebar }: SidebarProps) {
  return (
    <aside
      className={clsx(
        "bg-black/20 text-white/70 flex flex-col h-full border-r border-white/5 backdrop-blur-3xl z-40 transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1) relative shadow-[20px_0_50px_rgba(0,0,0,0.3)]",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className={clsx(
        "p-6 flex items-center",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        <button
          onClick={onToggleSidebar}
          className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-300 group active:scale-95"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <svg className="w-5 h-5 text-white/30 group-hover:text-white/90 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="3" y="3" width="18" height="18" rx="3" strokeWidth="2" stroke="currentColor" fill="none" />
            <line x1="9" y1="3" x2="9" y2="21" strokeWidth="2" stroke="currentColor" />
          </svg>
        </button>

        {!isCollapsed && (
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-white/5 rounded-lg transition-all group opacity-80 hover:opacity-100"
            title="Close"
          >
            <svg className="w-4 h-4 text-white/20 group-hover:text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1.5 mt-2 scrollbar-none">
        {availableTiles.map((tile) => {
          const isActive = activeTileIds.includes(tile.id)
          return (
            <button
              key={tile.id}
              onClick={() => onToggleTile(tile.id)}
              className={clsx(
                'w-full text-left rounded-2xl transition-all duration-500 flex items-center group relative overflow-hidden',
                isCollapsed ? "justify-center py-5 px-0" : "px-4 py-3.5 justify-start gap-4",
                isActive
                  ? 'bg-white/[0.08] text-white shadow-[0_8px_32px_rgba(0,0,0,0.2)] border border-white/10'
                  : 'text-white/20 hover:bg-white/[0.04] hover:text-white/60 border border-transparent'
              )}
              title={isCollapsed ? tile.label : undefined}
            >
              <span className={clsx(
                "transition-all duration-700 shrink-0",
                isActive ? "opacity-100" : "opacity-40 group-hover:opacity-100 scale-95 group-hover:scale-105"
              )}>
                {tile.icon}
              </span>

              {!isCollapsed && (
                <span className="flex-1 text-[10px] font-black uppercase tracking-[0.15em] overflow-hidden text-ellipsis whitespace-nowrap animate-in slide-in-from-left-2 duration-500">
                  {tile.label}
                </span>
              )}

              {/* Ultra-thin indicator bar */}
              <div className={clsx(
                "w-[1.5px] h-4 rounded-full transition-all duration-700 absolute",
                isCollapsed ? "right-2" : "right-4",
                isActive ? "bg-white opacity-100 shadow-[0_0_12px_rgba(255,255,255,0.8)] translate-x-0" : "bg-white/10 opacity-0 translate-x-4"
              )} />
            </button>
          )
        })}
      </nav>

      <div className="p-6 mt-auto">
        {!isCollapsed ? (
          <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5 backdrop-blur-sm group/status">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-1.5 h-1.5 rounded-full bg-white opacity-20" />
                <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-white animate-ping opacity-10" />
              </div>
              <span className="text-[8px] uppercase tracking-[0.2em] font-black text-white/20 group-hover/status:text-white/40 transition-colors">Term: Live</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center opacity-20 hover:opacity-40 transition-opacity">
            <div className="w-1 h-1 rounded-full bg-white" />
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
