import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API_BASE, API_KEY } from '../config';
import { BrainCircuit } from 'lucide-react';

export default function AIBriefingCard() {
    const [briefing, setBriefing] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchBriefing = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/ai/briefing`, {
                headers: { 'X-API-Key': API_KEY }
            });
            if (!res.ok) throw new Error("Failed to fetch briefing");
            const data = await res.json();
            setBriefing(data.briefing);
            setError(null);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBriefing();
        const interval = setInterval(fetchBriefing, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            data-overview-block
            style={{
                background: 'rgba(15, 17, 23, 0.6)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderLeft: '4px solid #a855f7',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '20px'
            }}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
            }}>
                <h3 className="panel-title" style={{ color: '#a855f7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BrainCircuit size={16} />
                    AI SOC ANALYST BRIEFING
                </h3>
            </div>
            
            <div style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.6', minHeight: '60px' }}>
                {loading && !briefing ? (
                    <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7' }}
                    >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a855f7' }} />
                        Analyst is reviewing recent data...
                    </motion.div>
                ) : error && !briefing ? (
                    <span style={{ color: '#ef4444' }}>Unable to contact AI Analyst.</span>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        {briefing}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
