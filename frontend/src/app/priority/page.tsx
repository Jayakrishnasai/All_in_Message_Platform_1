'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Inbox,
    AlertCircle,
    Clock,
    ChevronRight,
    Filter,
    RefreshCw,
    CheckCircle,
    Archive
} from 'lucide-react';
import styles from './page.module.css';

interface PriorityMessage {
    id: string;
    content: string;
    priority_score: number;
    intent: string;
    urgency_keywords: string[];
    room_id: string;
    room_name?: string;
    sender?: string;
    timestamp?: string;
}

export default function PriorityInboxPage() {
    const router = useRouter();
    const [messages, setMessages] = useState<PriorityMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

    const aiBackendUrl = process.env.NEXT_PUBLIC_AI_BACKEND_URL || '/api';

    useEffect(() => {
        loadPriorityMessages();
    }, []);

    const loadPriorityMessages = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${aiBackendUrl}/priority`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        "URGENT: I need help with my order immediately!",
                        "Hi, I was wondering about your pricing plans",
                        "My account seems to be broken and I can't login",
                        "Thanks for helping me yesterday!",
                        "This is critical - please respond ASAP",
                        "Can you explain how this feature works?",
                        "The payment failed and I need support now",
                        "Just checking in to say hi"
                    ]
                })
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(data.messages);
            }
        } catch (error) {
            console.error('Failed to load priority messages:', error);
            // Mock data
            setMessages([
                { id: '1', content: 'URGENT: I need help with my order immediately!', priority_score: 9.5, intent: 'urgent', urgency_keywords: ['urgent', 'immediately', 'help'], room_id: '!demo:server', room_name: 'Instagram Support', sender: 'user_123', timestamp: new Date().toISOString() },
                { id: '2', content: 'This is critical - please respond ASAP', priority_score: 8.2, intent: 'urgent', urgency_keywords: ['critical', 'asap'], room_id: '!demo:server', room_name: 'Instagram Support', sender: 'user_456' },
                { id: '3', content: 'My account seems to be broken and I can\'t login', priority_score: 7.1, intent: 'support', urgency_keywords: ['broken'], room_id: '!demo:server', room_name: 'Instagram Support', sender: 'user_789' },
                { id: '4', content: 'The payment failed and I need support now', priority_score: 6.8, intent: 'support', urgency_keywords: ['failed', 'now', 'support'], room_id: '!demo2:server', room_name: 'Sales', sender: 'customer_1' },
                { id: '5', content: 'Hi, I was wondering about your pricing plans', priority_score: 4.2, intent: 'sales', urgency_keywords: [], room_id: '!demo2:server', room_name: 'Sales', sender: 'lead_1' },
                { id: '6', content: 'Can you explain how this feature works?', priority_score: 3.5, intent: 'support', urgency_keywords: [], room_id: '!demo:server', room_name: 'Instagram Support', sender: 'user_new' },
                { id: '7', content: 'Thanks for helping me yesterday!', priority_score: 1.2, intent: 'casual', urgency_keywords: [], room_id: '!demo:server', room_name: 'Instagram Support', sender: 'user_happy' },
                { id: '8', content: 'Just checking in to say hi', priority_score: 0.8, intent: 'casual', urgency_keywords: [], room_id: '!demo:server', room_name: 'General', sender: 'friend' },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const getPriorityLevel = (score: number) => {
        if (score >= 6) return 'high';
        if (score >= 3) return 'medium';
        return 'low';
    };

    const filteredMessages = messages.filter(msg => {
        if (filter === 'all') return true;
        return getPriorityLevel(msg.priority_score) === filter;
    });

    const stats = {
        high: messages.filter(m => m.priority_score >= 6).length,
        medium: messages.filter(m => m.priority_score >= 3 && m.priority_score < 6).length,
        low: messages.filter(m => m.priority_score < 3).length,
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
                    <div>
                        <h1><Inbox size={24} /> Priority Inbox</h1>
                        <p>Messages ranked by urgency and importance</p>
                    </div>
                </div>
                <button className="btn btn-secondary" onClick={loadPriorityMessages}>
                    <RefreshCw size={18} />
                    Refresh
                </button>
            </header>

            {/* Stats Bar */}
            <div className={styles.statsBar}>
                <button
                    className={`${styles.statButton} ${filter === 'all' ? styles.active : ''}`}
                    onClick={() => setFilter('all')}
                >
                    <span className={styles.statCount}>{messages.length}</span>
                    <span>All</span>
                </button>
                <button
                    className={`${styles.statButton} ${styles.high} ${filter === 'high' ? styles.active : ''}`}
                    onClick={() => setFilter('high')}
                >
                    <span className={styles.statCount}>{stats.high}</span>
                    <span>High Priority</span>
                </button>
                <button
                    className={`${styles.statButton} ${styles.medium} ${filter === 'medium' ? styles.active : ''}`}
                    onClick={() => setFilter('medium')}
                >
                    <span className={styles.statCount}>{stats.medium}</span>
                    <span>Medium</span>
                </button>
                <button
                    className={`${styles.statButton} ${styles.low} ${filter === 'low' ? styles.active : ''}`}
                    onClick={() => setFilter('low')}
                >
                    <span className={styles.statCount}>{stats.low}</span>
                    <span>Low</span>
                </button>
            </div>

            {/* Messages List */}
            <div className={styles.messagesList}>
                {isLoading ? (
                    <div className={styles.loading}>
                        <div className="spinner" />
                        <span>Analyzing messages...</span>
                    </div>
                ) : filteredMessages.length === 0 ? (
                    <div className={styles.empty}>
                        <CheckCircle size={48} />
                        <p>No messages match the current filter</p>
                    </div>
                ) : (
                    filteredMessages.map((message) => (
                        <div
                            key={message.id}
                            className={`${styles.messageCard} ${styles[getPriorityLevel(message.priority_score)]}`}
                        >
                            <div className={styles.priorityIndicator}>
                                <span className={styles.priorityScore}>
                                    {message.priority_score.toFixed(1)}
                                </span>
                            </div>

                            <div className={styles.messageContent}>
                                <div className={styles.messageHeader}>
                                    <span className={styles.sender}>{message.sender || 'Unknown'}</span>
                                    <span className={styles.room}>{message.room_name}</span>
                                    <span className={`badge intent-${message.intent}`}>{message.intent}</span>
                                </div>

                                <p className={styles.messageText}>{message.content}</p>

                                {message.urgency_keywords.length > 0 && (
                                    <div className={styles.keywords}>
                                        {message.urgency_keywords.map((kw, idx) => (
                                            <span key={idx} className={styles.keyword}>{kw}</span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className={styles.actions}>
                                <button
                                    className={styles.actionBtn}
                                    onClick={() => router.push(`/rooms/${encodeURIComponent(message.room_id)}`)}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
