import LiveTrafficChart from '../components/LiveTrafficChart';
import AppDistributionChart from '../components/AppDistributionChart';
import AlertsStream from '../components/AlertsStream';
import { usePollerFallback } from '../lib/poller';
import { useAppStore } from '../store/useAppStore';
import { Activity, ShieldAlert, Cpu, ArrowUpDown } from 'lucide-react';

export default function DashboardPage() {
  usePollerFallback();
  const stats = useAppStore(state => state.stats);

  const topAppName = stats?.top_apps && Object.keys(stats.top_apps).length > 0 
    ? Object.keys(stats.top_apps)[0] 
    : 'None';

  const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0);
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 relative overflow-hidden group hover:border-[#22d3ee] transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#22d3ee] to-transparent opacity-70"></div>
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Packets</p>
            <Cpu className="text-gray-500 w-5 h-5 group-hover:text-[#22d3ee] transition-colors" />
          </div>
          <h4 className="text-2xl font-bold text-white">{formatNumber(stats?.total_packets)}</h4>
        </div>
        
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 relative overflow-hidden group hover:border-[#a78bfa] transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#a78bfa] to-transparent opacity-70"></div>
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Traffic</p>
            <ArrowUpDown className="text-gray-500 w-5 h-5 group-hover:text-[#a78bfa] transition-colors" />
          </div>
          <h4 className="text-2xl font-bold text-white">{formatBytes(stats?.total_bytes)}</h4>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 relative overflow-hidden group hover:border-red-500 transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-transparent opacity-70"></div>
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Blocked Flows</p>
            <ShieldAlert className="text-gray-500 w-5 h-5 group-hover:text-red-500 transition-colors" />
          </div>
          <h4 className="text-2xl font-bold text-red-100">{formatNumber(stats?.blocked_count)}</h4>
        </div>
        
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500 transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-70"></div>
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Top Application</p>
            <Activity className="text-gray-500 w-5 h-5 group-hover:text-emerald-500 transition-colors" />
          </div>
          <h4 className="text-xl font-bold text-emerald-400 truncate" title={topAppName}>{topAppName}</h4>
        </div>
      </div>

      {/* Middle Charts */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-[70%]">
          <LiveTrafficChart />
        </div>
        <div className="w-full lg:w-[30%]">
          <AppDistributionChart />
        </div>
      </div>
      
      {/* Bottom Alerts Row */}
      <div className="grid grid-cols-1">
        <AlertsStream limit={10} showHeader={true} />
      </div>
    </div>
  );
}
