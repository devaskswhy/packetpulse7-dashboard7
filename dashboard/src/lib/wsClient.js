import { useAppStore } from '../store/useAppStore';
import { API_KEY, WS_BASE } from '../config';

let ws = null;
let reconnectCount = 0;
let reconnectTimer = null;

const connectWS = () => {
  const { setWsStatus, setStats, prependAlerts } = useAppStore.getState();
  
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return;
  }

  setWsStatus('connecting');
  
  // Connect to the specific localhost:8000 endpoint
  const wsUrl = `${WS_BASE}/ws/live?api_key=${encodeURIComponent(API_KEY)}`;
  
  try {
    ws = new WebSocket(wsUrl);
  } catch (err) {
    setWsStatus('offline');
    return;
  }

  ws.onopen = () => {
    console.log('[WS] Connected to live engine');
    setWsStatus('live');
    reconnectCount = 0;
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'stats') {
        setStats(msg.data);
      } else if (msg.type === 'alert') {
        prependAlerts([msg.data]);
      } else if (msg.type === 'flows_update') {
        window.dispatchEvent(new CustomEvent('flows_updated', { detail: { count: msg.count } }));
      }
    } catch (e) {
      console.error('[WS] Error parsing message', e);
    }
  };

  ws.onclose = () => {
    console.log('[WS] Disconnected');
    
    if (reconnectCount >= 3) {
      setWsStatus('polling');
      return;
    }
    
    setWsStatus('connecting');
    // Exponential backoff
    const backoff = Math.min(1000 * Math.pow(2, reconnectCount), 30000);
    reconnectCount++;
    
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      connectWS();
    }, backoff);
  };

  ws.onerror = (err) => {
    console.error('[WS] Connection error', err);
    if (ws) ws.close();
  };
};

export const initWebSocket = () => {
  connectWS();
  return () => {
    if (ws) {
      ws.close();
      clearTimeout(reconnectTimer);
      ws = null;
    }
  };
};
