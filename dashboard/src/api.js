import axios from "axios";
import { API_BASE, API_KEY } from "./config";

const api = axios.create({
    baseURL: API_BASE,
    timeout: 10_000,
    headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
    },
});

export const fetchStats = () => api.get("/stats").then((r) => r.data);
export const fetchFlows = (params) => api.get("/flows", { params }).then((r) => r.data);
export const fetchAlerts = () => api.get("/alerts").then((r) => r.data);
export const healthCheck = () => api.get("/health").then((r) => r.data);

export default api;
