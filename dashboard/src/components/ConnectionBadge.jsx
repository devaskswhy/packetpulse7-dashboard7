import { useAppStore } from '../store/useAppStore';

export default function ConnectionBadge() {
  const wsStatus = useAppStore(state => state.wsStatus);

  if (wsStatus === 'live') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
        LIVE
      </div>
    );
  }

  if (wsStatus === 'polling') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wide">
        <div className="w-3 h-3 text-amber-400 animate-spin">↻</div>
        POLLING
      </div>
    );
  }

  if (wsStatus === 'connecting') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide">
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
        CONNECTING
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold tracking-wide">
      <div className="w-2 h-2 rounded-full bg-red-400" />
      OFFLINE
    </div>
  );
}
