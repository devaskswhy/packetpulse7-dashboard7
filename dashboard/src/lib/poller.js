import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { API_BASE, API_KEY } from '../config';
const fetchStats = async () => {
  const res = await fetch(`${API_BASE}/stats`, {
    headers: { 'X-API-Key': API_KEY }
  });
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
};

const fetchAlerts = async () => {
  const res = await fetch(`${API_BASE}/alerts?limit=100`, {
    headers: { 'X-API-Key': API_KEY }
  });
  if (!res.ok) throw new Error('Fetch failed');
  return res.json();
};

export const usePollerFallback = () => {
  const { wsStatus, setStats, setAlerts } = useAppStore();
  const isPolling = wsStatus === 'polling';
  const queryClient = useQueryClient();

  useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const data = await fetchStats();
      setStats(data);
      return data;
    },
    refetchInterval: isPolling ? 5000 : false,
    enabled: isPolling
  });

  useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const data = await fetchAlerts();
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
