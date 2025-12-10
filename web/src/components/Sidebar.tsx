import { clsx } from 'clsx'

export type SidebarProps = {
  availableTiles: { id: string; label: string }[]
  activeTileIds: string[]
  onToggleTile: (id: string) => void
}

export function Sidebar({ availableTiles, activeTileIds, onToggleTile }: SidebarProps) {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 font-semibold text-gray-700">
        Tiles
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {availableTiles.map((tile) => {
          const isActive = activeTileIds.includes(tile.id)
          return (
            <button
              key={tile.id}
              onClick={() => onToggleTile(tile.id)}
              className={clsx(
                'w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between',
                isActive
                  ? 'bg-white text-blue-600 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <span>{tile.label}</span>
              {isActive && (
                <span className="w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default Sidebar
