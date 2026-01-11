'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Send,
    MoreVertical,
    Brain,
    AlertCircle,
    RefreshCw,
    Paperclip,
    Smile
} from 'lucide-react';
import styles from './page.module.css';

interface Message {
    id: string;
    sender: string;
    content: string;
    timestamp: string;
    intent?: string;
    priority_score?: number;
}

interface RoomInfo {
    id: string;
    name: string;
    topic?: string;
    member_count: number;
}

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomId = decodeURIComponent(params.roomId as string);

    const [messages, setMessages] = useState<Message[]>([]);
    const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [summary, setSummary] = useState<string | null>(null);
    const [showSummary, setShowSummary] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const aiBackendUrl = process.env.NEXT_PUBLIC_AI_BACKEND_URL || '/api';

    useEffect(() => {
        loadRoomData();
    }, [roomId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadRoomData = async () => {
        setIsLoading(true);
        try {
            // Load messages
            const response = await fetch(`${aiBackendUrl}/messages/${encodeURIComponent(roomId)}?limit=100`);
            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Failed to load room data:', error);
            // Mock data for demo
            setMessages([
                { id: '1', sender: 'instagram_user123', content: 'Hi, I need help with my order', timestamp: new Date().toISOString(), intent: 'support' },
                { id: '2', sender: 'admin', content: 'Hello! I\'d be happy to help. What seems to be the issue?', timestamp: new Date().toISOString() },
                { id: '3', sender: 'instagram_user123', content: 'My package hasn\'t arrived yet and it\'s been a week', timestamp: new Date().toISOString(), intent: 'urgent' },
                { id: '4', sender: 'admin', content: 'I apologize for the delay. Let me check the tracking status for you.', timestamp: new Date().toISOString() },
            ]);
        }

        setRoomInfo({
            id: roomId,
            name: 'Instagram Bridge - Support',
            topic: 'Customer support via Instagram',
            member_count: 3
        });

        setIsLoading(false);
    };

    const generateSummary = async () => {
        if (messages.length === 0) return;

        try {
            const response = await fetch(`${aiBackendUrl}/summarize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages.map(m => m.content),
                    max_length: 150
                })
            });

            if (response.ok) {
                const data = await response.json();
                setSummary(data.summary);
                setShowSummary(true);
            }
        } catch (error) {
            console.error('Failed to generate summary:', error);
            setSummary("The conversation involves a customer asking for help with an order that hasn't arrived after a week. Support is assisting with tracking the package.");
            setShowSummary(true);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const message: Message = {
            id: Date.now().toString(),
            sender: 'admin',
            content: newMessage,
            timestamp: new Date().toISOString()
        };

        setMessages([...messages, message]);
        setNewMessage('');
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getIntentBadge = (intent?: string) => {
        if (!intent) return null;
        return <span className={`badge intent-${intent}`}>{intent}</span>;
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <button
                        className={styles.backBtn}
                        onClick={() => router.push('/dashboard')}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className={styles.roomInfo}>
                        <h1>{roomInfo?.name || 'Room'}</h1>
                        <p>{roomInfo?.member_count} members • {roomInfo?.topic}</p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button
                        className="btn btn-secondary"
                        onClick={generateSummary}
                    >
                        <Brain size={18} />
                        Summarize
                    </button>
                    <button className="btn btn-ghost" onClick={loadRoomData}>
                        <RefreshCw size={18} />
                    </button>
                    <button className="btn btn-ghost">
                        <MoreVertical size={18} />
                    </button>
                </div>
            </header>

            {/* Summary Panel */}
            {showSummary && summary && (
                <div className={styles.summaryPanel}>
                    <div className={styles.summaryHeader}>
                        <Brain size={18} />
                        <span>AI Summary</span>
                        <button onClick={() => setShowSummary(false)}>×</button>
                    </div>
                    <p>{summary}</p>
                </div>
            )}

            {/* Messages */}
            <div className={styles.messagesContainer}>
                {isLoading ? (
                    <div className={styles.loading}>
                        <div className="spinner" />
                        <span>Loading messages...</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className={styles.empty}>
                        <p>No messages yet</p>
                    </div>
                ) : (
                    <div className={styles.messagesList}>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`${styles.message} ${message.sender === 'admin' ? styles.sent : styles.received
                                    }`}
                            >
                                <div className={styles.messageHeader}>
                                    <span className={styles.sender}>{message.sender}</span>
                                    <span className={styles.time}>{formatTime(message.timestamp)}</span>
                                    {getIntentBadge(message.intent)}
                                </div>
                                <div className={styles.messageContent}>
                                    {message.content}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <form className={styles.inputArea} onSubmit={handleSendMessage}>
                <button type="button" className={styles.attachBtn}>
                    <Paperclip size={20} />
                </button>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className={styles.messageInput}
                />
                <button type="button" className={styles.emojiBtn}>
                    <Smile size={20} />
                </button>
                <button
                    type="submit"
                    className={styles.sendBtn}
                    disabled={!newMessage.trim()}
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
}
