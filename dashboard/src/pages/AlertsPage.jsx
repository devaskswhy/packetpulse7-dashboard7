import AlertsStream from '../components/AlertsStream';
import { usePollerFallback } from '../lib/poller';

export default function AlertsPage() {
  usePollerFallback();
  return (
    <div className="h-[calc(100vh-140px)]">
      <AlertsStream limit={0} showHeader={false} />
    </div>
  );
}
