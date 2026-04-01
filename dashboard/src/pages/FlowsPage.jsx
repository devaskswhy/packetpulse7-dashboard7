import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import FlowTable from '../components/FlowTable';
import { useAppStore } from '../store/useAppStore';
import { usePollerFallback } from '../lib/poller';
import { Filter, AlertCircle } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

export default function FlowsPage() {
  usePollerFallback();
  const apiKey = useAppStore(state => state.apiKey);
  const [appFilter, setAppFilter] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('');
  const [blockedOnly, setBlockedOnly] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['flows', apiKey, appFilter, protocolFilter, blockedOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('limit', '500'); 
      if (appFilter) params.append('app', appFilter);
      if (protocolFilter) params.append('protocol', protocolFilter);
      if (blockedOnly) params.append('blocked', 'true');

      const res = await fetch(`${API_BASE}/flows?${params.toString()}`, {
        headers: { 'X-API-Key': apiKey }
      });
      if (!res.ok) throw new Error('Failed to fetch flows');
      return res.json();
    },
    refetchInterval: 10000 
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 text-[#e2e8f0] font-semibold text-sm">
          <Filter className="w-4 h-4 text-[#94a3b8]" /> Filters
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <input 
            type="text" 
            placeholder="App (e.g., YouTube)" 
            value={appFilter}
            onChange={(e) => setAppFilter(e.target.value)}
            className="bg-[#1e293b] border border-[#334155] rounded-md px-3 py-1.5 text-xs text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#22d3ee] w-36"
          />
          <select 
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
            className="bg-[#1e293b] border border-[#334155] rounded-md px-3 py-1.5 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#22d3ee]"
          >
            <option value="">All Protocols</option>
            <option value="TCP">TCP</option>
            <option value="UDP">UDP</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-[#e2e8f0] cursor-pointer bg-[#1e293b] border border-[#334155] rounded-md px-3 py-1.5 select-none hover:bg-[#334155] transition-colors">
            <input 
              type="checkbox" 
              checked={blockedOnly}
              onChange={(e) => setBlockedOnly(e.target.checked)}
              className="accent-red-500 w-3 h-3 cursor-pointer"
            />
            Blocked Only
          </label>
        </div>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5" /> Error loading flows: {error.message}
        </div>
      ) : (
        <FlowTable flowsData={data?.data} isLoading={isLoading} />
      )}
    </div>
  );
}
