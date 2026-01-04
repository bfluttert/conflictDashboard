import { useConflictSummary } from '../hooks/useConflictSummary'

export default function SummaryTile({
  conflictId,
  countryId,
  conflictName,
  countryName,
}: {
  conflictId?: number
  countryId?: number
  conflictName?: string | null
  countryName?: string | null
}) {
  const { data, isLoading, error } = useConflictSummary(conflictId, countryId, { conflictName, countryName })

  if (!conflictId && !countryId) {
    return (
      <div className="flex h-full flex-col p-3 text-sm text-gray-500 justify-center items-center text-center">
        <p>Select a conflict or country to view its AI-generated summary.</p>
      </div>
    )
  }

  if (isLoading) return (
    <div className="p-6 flex flex-col gap-4 animate-pulse">
      <div className="h-4 w-1/3 bg-white/5 rounded" />
      <div className="h-20 w-full bg-white/5 rounded-2xl" />
    </div>
  )

  if (error) {
    return (
      <div className="p-6 flex flex-col h-full items-center justify-center text-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-white font-black uppercase tracking-widest text-xs mb-1">Intelligence Failure</h3>
          <p className="text-white/40 text-[10px] leading-relaxed max-w-[200px]">
            {error.message || 'The secure channel could not be established.'}
          </p>
        </div>
      </div>
    )
  }

  if (!data?.summary) return (
    <div className="p-6 flex flex-col h-full items-center justify-center text-center opacity-40">
      <div className="text-[10px] font-black uppercase tracking-widest text-white/50">Intelligence Pending</div>
      <p className="text-[10px] mt-2 italic font-mono uppercase tracking-tighter">No encrypted transmission received.</p>
    </div>
  )

  return (
    <div className="flex h-full flex-col p-6 overflow-y-auto text-sm leading-relaxed text-white/80 font-medium">
      <div className="text-[10px] text-white/30 mb-4 font-black uppercase tracking-widest flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
        Intelligence Report
        {data.cached ? ' [OPTIMIZED]' : ''}
      </div>
      <div className="whitespace-pre-line leading-loose text-white/90 drop-shadow-sm">{data.summary}</div>
      <div className="mt-8 pt-4 border-t border-white/5 text-[9px] text-white/20 font-mono tracking-tighter">
        SECURE CHANNELS // AGENT: {data.model.toUpperCase()} // STATUS: VERIFIED
      </div>
    </div>
  )
}
