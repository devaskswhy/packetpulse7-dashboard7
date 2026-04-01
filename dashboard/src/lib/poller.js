import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';

const API_BASE = 'http://localhost:8000';

const fetchStats = async (apiKey) => {
  const res = await fetch(`${API_BASE}/stats`, {
    headers: { 'X-API-Key': apiKey }
  });
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
};

const fetchAlerts = async (apiKey) => {
  const res = await fetch(`${API_BASE}/alerts?limit=100`, {
    headers: { 'X-API-Key': apiKey }
  });
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
};

export const usePollerFallback = () => {
  const { wsStatus, apiKey, setStats, setAlerts } = useAppStore();
  const isPolling = wsStatus === 'polling';
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ['stats', apiKey],
    queryFn: async () => {
      const data = await fetchStats(apiKey);
      setStats(data);
      return data;
    },
    refetchInterval: isPolling ? 5000 : false,
    enabled: isPolling
  });

  useQuery({
    queryKey: ['alerts', apiKey],
    queryFn: async () => {
      const data = await fetchAlerts(apiKey);
      setAlerts(data.data || []);
      return data;
    },
    refetchInterval: isPolling ? 10000 : false,
    enabled: isPolling
  });

  useEffect(() => {
    const handleFlowsUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['flows'] });
    };
    window.addEventListener('flows_updated', handleFlowsUpdate);
    return () => window.removeEventListener('flows_updated', handleFlowsUpdate);
  }, [queryClient]);
};
