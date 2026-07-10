import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE, API_KEY } from '../config';
import { MessageSquare, X, Send, BrainCircuit, Maximize2, Minimize2 } from 'lucide-react';

export default function AskAnalystChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', text: 'Hello! I am your AI SOC Analyst. Ask me anything about the recent traffic and alerts.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const res = await fetch(`${API_BASE}/ai/ask`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-API-Key': API_KEY 
                },
                body: JSON.stringify({ question: userMsg })
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'assistant', text: data.answer || "I'm sorry, I couldn't process that." }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', text: "Error connecting to AI service." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            width: isExpanded ? '50vw' : '350px',
                            height: isExpanded ? '70vh' : '450px',
                            minWidth: '350px',
                            minHeight: '450px',
                            background: 'rgba(15, 17, 23, 0.95)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 20px rgba(168, 85, 247, 0.2)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            flexDirection: 'column',
                            marginBottom: '16px',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '16px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(168, 85, 247, 0.1)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontWeight: '600' }}>
                                <BrainCircuit size={18} color="#a855f7" />
                                Ask the Analyst
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button onClick={() => setIsExpanded(!isExpanded)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                                <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="chat-scroll" style={{
                            flex: 1,
                            padding: '16px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            {messages.map((msg, i) => (
                                <div key={i} style={{
                                    display: 'flex',
                                    gap: '8px',
                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%'
                                }}>
                                    {msg.role === 'assistant' && (
                                        <div style={{ marginTop: '2px' }}>
                                            <BrainCircuit size={16} color="#a855f7" />
                                        </div>
                                    )}
                                    <div style={{
                                        background: msg.role === 'user' ? '#a855f7' : 'rgba(255,255,255,0.05)',
                                        color: msg.role === 'user' ? '#fff' : '#e2e8f0',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        borderTopLeftRadius: msg.role === 'assistant' ? 0 : '8px',
                                        borderTopRightRadius: msg.role === 'user' ? 0 : '8px',
                                        fontSize: '13px',
                                        lineHeight: '1.5',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div style={{ display: 'flex', gap: '8px', alignSelf: 'flex-start' }}>
                                    <div style={{ marginTop: '2px' }}>
                                        <BrainCircuit size={16} color="#a855f7" />
                                    </div>
                                    <motion.div
                                        animate={{ opacity: [0.4, 1, 0.4] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            color: '#94a3b8',
                                            padding: '10px 14px',
                                            borderRadius: '8px',
                                            borderTopLeftRadius: 0,
                                            fontSize: '13px'
                                        }}
                                    >
                                        Analyzing...
                                    </motion.div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSubmit} style={{
                            padding: '12px 16px',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            gap: '8px'
                        }}>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about recent activity..."
                                style={{
                                    flex: 1,
                                    background: 'rgba(0,0,0,0.3)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '6px',
                                    padding: '8px 12px',
                                    color: '#e2e8f0',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                style={{
                                    background: input.trim() && !isLoading ? '#a855f7' : 'rgba(255,255,255,0.05)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '8px',
                                    color: '#fff',
                                    cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isOpen && (
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(true)}
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: '#a855f7',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <MessageSquare size={24} />
                </motion.button>
            )}
        </div>
    );
}
