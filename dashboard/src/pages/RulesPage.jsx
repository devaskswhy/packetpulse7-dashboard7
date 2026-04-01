import { useState, useEffect } from 'react';
import { Shield, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { API_BASE, API_KEY } from '../config';

export default function RulesPage() {
  const [blockedIps, setBlockedIps] = useState('');
  const [blockedDomains, setBlockedDomains] = useState('');
  const [status, setStatus] = useState({ type: '', msg: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/rules`, { headers: { 'X-API-Key': API_KEY } })
      .then(res => res.json())
      .then(data => {
        if (data.blocked_ips) setBlockedIps(data.blocked_ips.join('\n'));
        if (data.blocked_domains) setBlockedDomains(data.blocked_domains.join('\n'));
      })
      .catch(err => console.error('Failed to load rules', err));
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setStatus({ type: '', msg: '' });
    
    const ips = blockedIps.split('\n').map(s => s.trim()).filter(Boolean);
    const domains = blockedDomains.split('\n').map(s => s.trim()).filter(Boolean);

    try {
      const res = await fetch(`${API_BASE}/rules`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        },
        body: JSON.stringify({
          blocked_ips: ips,
          blocked_domains: domains
        })
      });

      if (!res.ok) throw new Error('Failed to update rules');
      setStatus({ type: 'success', msg: 'Detection rules updated successfully' });
    } catch (error) {
      setStatus({ type: 'error', msg: error.message });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: '', msg: '' }), 5000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-2">
        <h2 className="text-xl font-bold text-[#e2e8f0] flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#22d3ee]" />
          Detection Rules Engine
        </h2>
        <p className="text-sm text-[#94a3b8] mt-1">Configure automated blocking rules and thresholds.</p>
      </div>

      {status.msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm ${status.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {status.msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 shadow-sm">
          <label className="block text-sm font-semibold text-[#e2e8f0] mb-2">Blocked IP Addresses</label>
          <p className="text-xs text-[#64748b] mb-3">One IP address per line. Traffic from these sources will be dropped.</p>
          <textarea
            value={blockedIps}
            onChange={(e) => setBlockedIps(e.target.value)}
            className="w-full h-48 bg-[#1e293b] border border-[#334155] rounded-lg p-3 text-sm text-[#e2e8f0] placeholder-[#475569] font-mono focus:outline-none focus:border-[#22d3ee] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#334155] [&::-webkit-scrollbar-thumb]:rounded"
            placeholder="192.168.1.100\n10.0.0.5"
          />
        </div>

        <div className="bg-[#111827] border border-[#1e293b] rounded-xl p-5 shadow-sm">
          <label className="block text-sm font-semibold text-[#e2e8f0] mb-2">Blocked Domains (SNI)</label>
          <p className="text-xs text-[#64748b] mb-3">One domain pattern per line. Supports wildcards (e.g., *.malware.com).</p>
          <textarea
            value={blockedDomains}
            onChange={(e) => setBlockedDomains(e.target.value)}
            className="w-full h-48 bg-[#1e293b] border border-[#334155] rounded-lg p-3 text-sm text-[#e2e8f0] placeholder-[#475569] font-mono focus:outline-none focus:border-[#22d3ee] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-[#334155] [&::-webkit-scrollbar-thumb]:rounded"
            placeholder="*.ads.com\nmalicious-site.net"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-gradient-to-r from-[#22d3ee] to-[#a78bfa] text-[#0a0e1a] px-6 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? <div className="w-4 h-4 border-2 border-[#0a0e1a] border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? 'Saving...' : 'Save Rules'}
        </button>
      </div>
    </div>
  );
}
