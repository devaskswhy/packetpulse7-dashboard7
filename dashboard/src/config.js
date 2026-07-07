export const API_KEY = import.meta.env.VITE_API_KEY || "dev_key_12345";
export const API_BASE = (import.meta.env.VITE_API_BASE || "https://packetpulse7-dashboard7-production.up.railway.app").replace(/\/$/, "");
export const WS_BASE = (import.meta.env.VITE_WS_BASE || "wss://packetpulse7-dashboard7-production.up.railway.app").replace(/\/$/, "");
