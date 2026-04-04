import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDPI } from '../../context/DPIContext';

export default function AlertToast() {
  const { alerts } = useDPI();
  const [toasts, setToasts] = useState([]);
  const previousAlertsRef = useRef([]);
  const toastIdRef = useRef(0);

  // Check for new alerts
  useEffect(() => {
    if (!alerts || alerts.length === 0) return;

    const previousAlertIds = new Set(previousAlertsRef.current.map(a => a.id || a.timestamp));
    const newAlerts = alerts.filter(alert => !previousAlertIds.has(alert.id || alert.timestamp));

    if (newAlerts.length > 0) {
      // Add only the latest 3 new alerts as toasts
      const latestAlerts = newAlerts.slice(-3).reverse();
      
      latestAlerts.forEach(alert => {
        const toastId = `toast-${toastIdRef.current++}`;
        const toast = {
          id: toastId,
          alert,
          severity: alert.severity || 'medium',
          type: alert.alert_type || alert.type || 'Unknown',
          srcIp: alert.src_ip || alert.source_ip || 'Unknown',
          reason: alert.reason || alert.description || 'No description',
          timestamp: alert.timestamp || Date.now()
        };

        setToasts(prev => {
          const updated = [toast, ...prev].slice(0, 3); // Keep max 3 toasts
          return updated;
        });

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toastId));
        }, 5000);
      });

      previousAlertsRef.current = alerts;
    }
  }, [alerts]);

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return '#ef4444'; // red
      case 'high':
        return '#f97316'; // orange
      case 'medium':
        return '#eab308'; // yellow
      case 'low':
        return '#3b82f6'; // blue
      default:
        return '#eab308'; // yellow
    }
  };

  const dismissToast = (toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  };

  const truncateText = (text, maxLength = 40) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="alert-toast-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="alert-toast"
            style={{
              position: 'fixed',
              bottom: `${24 + toasts.indexOf(toast) * 100}px`,
              right: '24px',
              width: '320px',
              zIndex: 10000,
            }}
          >
            <div 
              className="alert-toast-content"
              style={{
                background: 'rgba(15, 17, 23, 0.95)',
                backdropFilter: 'blur(10px)',
                borderLeft: `4px solid ${getSeverityColor(toast.severity)}`,
                borderRadius: '8px',
                padding: '16px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span 
                    className="severity-badge"
                    style={{
                      background: `${getSeverityColor(toast.severity)}20`,
                      color: getSeverityColor(toast.severity),
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '10px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                    }}
                  >
                    {toast.severity}
                  </span>
                  <span style={{ color: '#22d3ee', fontSize: '12px', fontWeight: '500' }}>
                    {toast.type}
                  </span>
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '0',
                    lineHeight: '1',
                  }}
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
                  Source: {toast.srcIp}
                </div>
                <div style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: '1.4' }}>
                  {truncateText(toast.reason)}
                </div>
              </div>

              {/* Progress bar */}
              <div 
                className="toast-progress"
                style={{
                  height: '2px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '1px',
                  overflow: 'hidden',
                  marginTop: '8px',
                }}
              >
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                  style={{
                    height: '100%',
                    background: getSeverityColor(toast.severity),
                  }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
