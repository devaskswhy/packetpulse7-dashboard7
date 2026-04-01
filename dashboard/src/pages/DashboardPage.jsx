import LiveTrafficChart from '../components/LiveTrafficChart';
import AppDistributionChart from '../components/AppDistributionChart';
import AlertsStream from '../components/AlertsStream';
import { usePollerFallback } from '../lib/poller';

export default function DashboardPage() {
  usePollerFallback();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveTrafficChart />
        </div>
        <div className="lg:col-span-1">
          <AppDistributionChart />
        </div>
      </div>
      <div className="grid grid-cols-1">
        <AlertsStream limit={10} showHeader={true} />
      </div>
    </div>
  );
}
