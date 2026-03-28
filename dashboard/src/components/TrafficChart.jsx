/**
 * TrafficChart — Area chart showing protocol-level traffic breakdown.
 * Uses real-time WebSocket deltas for smooth scrolling.
 */

import { useState, useEffect, useRef } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div
            style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 12,
            }}
        >
            <div style={{ fontWeight: 600, marginBottom: 6, color: "#e2e8f0" }}>
                {label}
            </div>
            {payload.map((p) => (
                <div
                    key={p.dataKey}
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 16,
                        color: p.color,
                    }}
                >
                    <span>{p.dataKey}</span>
                    <span style={{ fontWeight: 600 }}>
                        {p.value.toLocaleString()} pkt/s
                    </span>
                </div>
            ))}
        </div>
    );
};

export default function TrafficChart({ stats }) {
    const [data, setData] = useState(() => {
        // Init 30 empty points
        const pts = [];
        const now = Date.now();
        for (let i = 0; i < 30; i++) {
            pts.push({
                time: new Date(now - (30 - 1 - i) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                TCP: 0,
                UDP: 0,
                Other: 0,
            });
        }
        return pts;
    });

    const prevStatsRef = useRef(null);

    useEffect(() => {
        if (!stats) return;

        if (!prevStatsRef.current) {
            prevStatsRef.current = stats;
            return;
        }

        const prev = prevStatsRef.current;
        const dpTCP = stats.protocols.tcp - prev.protocols.tcp;
        const dpUDP = stats.protocols.udp - prev.protocols.udp;
        const dpOther = stats.protocols.other - prev.protocols.other;

        const now = new Date();
        const newPoint = {
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            TCP: dpTCP > 0 ? dpTCP : 0,
            UDP: dpUDP > 0 ? dpUDP : 0,
            Other: dpOther > 0 ? dpOther : 0,
        };

        setData(prevData => {
            const next = [...prevData, newPoint];
            if (next.length > 30) next.shift(); // keep sliding window of 30 pts
            return next;
        });

        prevStatsRef.current = stats;
    }, [stats]);

    return (
        <div className="chart-panel" style={{ gridColumn: "span 1" }}>
            <div className="panel-header">
                <div>
                    <div className="panel-title">Live Traffic Volume</div>
                    <div className="panel-subtitle">
                        Protocol bandwidth · 1-sec real-time deltas
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                    data={data}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="gradTCP" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradUDP" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradOther" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                    <XAxis
                        dataKey="time"
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        axisLine={{ stroke: "#1e293b" }}
                        tickLine={false}
                        minTickGap={20}
                    />
                    <YAxis
                        tick={{ fill: "#64748b", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) =>
                            v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v
                        }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
                    />
                    <Area
                        type="monotone"
                        dataKey="TCP"
                        stroke="#60a5fa"
                        strokeWidth={2}
                        fill="url(#gradTCP)"
                        isAnimationActive={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="UDP"
                        stroke="#a78bfa"
                        strokeWidth={2}
                        fill="url(#gradUDP)"
                        isAnimationActive={false}
                    />
                    <Area
                        type="monotone"
                        dataKey="Other"
                        stroke="#22d3ee"
                        strokeWidth={2}
                        fill="url(#gradOther)"
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
