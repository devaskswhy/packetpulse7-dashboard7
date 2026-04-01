import { create } from 'zustand';

export const useAppStore = create((set) => ({
  flows: [],
  stats: {},
  alerts: [],
  wsStatus: 'offline', // "connecting" | "live" | "polling" | "offline"
  apiKey: localStorage.getItem('__packetpulse_apikey') || 'simulated_key',
  
  setWsStatus: (status) => set({ wsStatus: status }),
  setApiKey: (key) => {
    localStorage.setItem('__packetpulse_apikey', key);
    set({ apiKey: key });
  },
  
  setFlows: (flows) => set({ flows }),
  
  setStats: (stats) => set({ stats }),
  
  prependAlerts: (newAlerts) => set((state) => {
    const updated = [...newAlerts, ...state.alerts].slice(0, 100);
    return { alerts: updated };
  }),
  
  setAlerts: (alerts) => set({ alerts })
}));
