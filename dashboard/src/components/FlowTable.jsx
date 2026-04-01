import { useState } from 'react';

export default function FlowTable({ flowsData, isLoading }) {
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  if (isLoading) {
    return <div className="p-8 text-center text-[#94a3b8] text-sm animate-pulse">Loading flows...</div>;
  }

  const flows = flowsData || [];
  const totalPages = Math.max(1, Math.ceil(flows.length / rowsPerPage));
  const currentFlows = flows.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const formatId = (id) => id ? id.substring(0, 8) + '...' : 'N/A';

  return (
    <div className="bg-[#111827] border border-[#1e293b] rounded-xl overflow-hidden shadow-lg w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#1e293b]/40 border-b border-[#1e293b]">
              <th className="py-3 px-4 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Flow ID</th>
              <th className="py-3 px-4 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Source &rarr; Destination</th>
              <th className="py-3 px-4 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">App</th>
              <th className="py-3 px-4 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider text-right">Bytes</th>
              <th className="py-3 px-4 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider text-right">Duration</th>
              <th className="py-3 px-4 text-xs font-semibold text-[#94a3b8] uppercase tracking-wider text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b]">
            {currentFlows.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-6 text-center text-[#64748b] text-sm">No flows match your criteria.</td>
              </tr>
            ) : (
              currentFlows.map((flow) => (
                <tr key={flow.flow_id} className={`hover:bg-[#22d3ee]/[0.02] transition-colors ${flow.blocked ? 'bg-red-500/5' : ''}`}>
                  <td className="py-3 px-4 text-[13px] font-mono text-[#e2e8f0]">{formatId(flow.flow_id)}</td>
                  <td className="py-3 px-4 text-[13px] text-[#e2e8f0]">
                    <div>{flow.src_ip}<span className="text-[#64748b] text-[11px] ml-1">:{flow.src_port}</span></div>
                    <div className="text-[#94a3b8] mt-0.5">&rarr; {flow.dst_ip}<span className="text-[#64748b] text-[11px] ml-1">:{flow.dst_port}</span></div>
                  </td>
                  <td className="py-3 px-4 text-[13px] text-[#e2e8f0]">{flow.app || flow.protocol || 'Unknown'}</td>
                  <td className="py-3 px-4 text-[13px] font-mono text-[#e2e8f0] text-right">{(flow.bytes / 1024).toFixed(1)} KB</td>
                  <td className="py-3 px-4 text-[13px] font-mono text-[#e2e8f0] text-right">{flow.duration_s?.toFixed(2)}s</td>
                  <td className="py-3 px-4 text-center">
                    {flow.blocked ? (
                      <span className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-[10px] font-bold tracking-wide uppercase border border-red-500/30">Blocked</span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wide uppercase border border-emerald-500/30">Allowed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="bg-[#1e293b]/20 px-4 py-3 border-t border-[#1e293b] flex items-center justify-between">
          <span className="text-xs text-[#94a3b8]">Page <strong className="text-[#e2e8f0]">{page}</strong> of <strong className="text-[#e2e8f0]">{totalPages}</strong></span>
          <div className="flex gap-2">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded bg-[#1e293b] text-[#e2e8f0] text-xs font-semibold hover:bg-[#334155] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded bg-[#1e293b] text-[#e2e8f0] text-xs font-semibold hover:bg-[#334155] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
