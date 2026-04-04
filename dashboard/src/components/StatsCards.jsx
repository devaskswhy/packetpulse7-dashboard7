/**
 * StatsCards — Six stat cards displayed in a responsive grid.
 * Maps the /stats API response to visual cards with icons and accents.
 */

import { useState, useEffect } from 'react';
import { motion, animate } from 'framer-motion';

const formatNumber = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toLocaleString();
};

const formatBytes = (b) => {
    if (b >= 1_073_741_824) return (b / 1_073_741_824).toFixed(1) + " GB";
    if (b >= 1_048_576) return (b / 1_048_576).toFixed(1) + " MB";
    if (b >= 1_024) return (b / 1_024).toFixed(1) + " KB";
    return b + " B";
};

export default function StatsCards({ stats }) {
    if (!stats) return null;

    const cards = [
        {
            label: "Total Packets",
            value: formatNumber(stats.total_packets || 0),
            sub: "Ingested",
            icon: "📦",
            accent: "cyan",
        },
        {
            label: "Total Traffic",
            value: formatBytes(stats.total_bytes || 0),
            sub: "Captured payload",
            icon: "📡",
            accent: "violet",
        },
        {
            label: "Blocked",
            value: formatNumber(stats.blocked_count || 0),
            sub: "Security drops",
            icon: "🛡️",
            accent: "rose",
        },
        {
            label: "Top Application",
            value: stats.top_apps && Object.keys(stats.top_apps).length > 0
                ? Object.keys(stats.top_apps)[0]
                : "None",
            sub: "Highest volume",
            icon: "🔥",
            accent: "emerald",
        }
    ];

    const [animatedValues, setAnimatedValues] = useState({});

    // Initialize animated values
    useEffect(() => {
        const newValues = {};
        cards.forEach((card) => {
            const numericValue = extractNumericValue(card.value);
            newValues[card.label] = numericValue;
        });
        setAnimatedValues(newValues);
    }, [stats]);

    // Animate value changes
    useEffect(() => {
        if (Object.keys(animatedValues).length === 0) return;
        
        cards.forEach((card) => {
            const numericValue = extractNumericValue(card.value);
            const currentValue = animatedValues[card.label] || 0;
            
            if (currentValue !== numericValue) {
                animate(currentValue, numericValue, {
                    duration: 0.8,
                    ease: "easeOut",
                    onUpdate: (v) => {
                        setAnimatedValues(prev => ({
                            ...prev,
                            [card.label]: v
                        }));
                    }
                });
            }
        });
    }, [stats]);

    const extractNumericValue = (value) => {
        if (typeof value === 'number') return value;
        const num = parseFloat(value.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 0 : num;
    };

    const formatAnimatedValue = (originalValue, animatedValue) => {
        if (typeof originalValue === 'number') {
            return formatNumber(animatedValue);
        }
        const suffix = originalValue.replace(/[0-9.,]/g, '').trim();
        const formatted = formatNumber(animatedValue);
        return suffix ? `${formatted}${suffix}` : formatted;
    };

    return (
        <div className="stats-grid">
            {cards.map((c) => (
                <div key={c.label} className={`stat-card ${c.accent} cyber-card`}>
                    <div className="corner corner-tl"></div>
                    <div className="corner corner-tr"></div>
                    <div className="corner corner-bl"></div>
                    <div className="corner corner-br"></div>
                    <div className="stat-header">
                        <span className="stat-label">{c.label}</span>
                        <span className="stat-icon">{c.icon}</span>
                    </div>
                    <motion.div className="stat-value">
                        {animatedValues[c.label] !== undefined 
                            ? formatAnimatedValue(c.value, animatedValues[c.label])
                            : c.value
                        }
                    </motion.div>
                    <div className="stat-sub">{c.sub}</div>
                </div>
            ))}
        </div>
    );
}
