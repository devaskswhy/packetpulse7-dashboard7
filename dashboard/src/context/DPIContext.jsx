import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { fetchStats, fetchFlows, fetchSNI } from "../api";

const DPIContext = createContext(null);

export function useDPI() {
    return useContext(DPIContext);
}

export function DPIProvider({ children }) {
    const [stats, setStats] = useState(null);
    const [flows, setFlows] = useState([]);
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);
    const wsRef = useRef(null);

    // Initial load from REST
    useEffect(() => {
        let isMounted = true;

        async function loadInitialData() {
            try {
                const [statsRes, flowsRes, sniRes] = await Promise.all([
                    fetchStats(),
                    fetchFlows({ limit: 50 }),
                    fetchSNI({ limit: 50 }),
                ]);

                if (isMounted) {
                    setStats(statsRes.stats);
                    setFlows(flowsRes.flows);
                    setDomains(sniRes.domains);
                    setLoading(false);
                }
            } catch (err) {
                console.error("Failed initial fetch:", err);
                if (isMounted) setLoading(false);
            }
        }

        loadInitialData();

        // Establish WebSocket connection
        // Dynamically get host/port (e.g. localhost:8000) based on REST api base
        // But for development simplicity, we use the known backend URL
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${wsProtocol}//localhost:8000/ws/live`;

        const connectWs = () => {
            const socket = new WebSocket(wsUrl);
            wsRef.current = socket;

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.stats) setStats(data.stats);
                    if (data.flows) setFlows(data.flows);
                    if (data.domains) setDomains(data.domains);
                } catch (e) {
                    console.error("WebSocket payload error:", e);
                }
            };

            socket.onclose = () => {
                console.log("WebSocket closed, attempting reconnect...");
                // Reconnect strategy
                setTimeout(() => {
                    if (isMounted) connectWs();
                }, 3000);
            };
        };

        connectWs();

        return () => {
            isMounted = false;
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const value = {
        stats,
        flows,
        domains,
        loading
    };

    return (
        <DPIContext.Provider value={value}>
            {children}
        </DPIContext.Provider>
    );
}
