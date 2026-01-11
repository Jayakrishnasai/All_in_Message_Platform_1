'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Send,
    MoreVertical,
    Brain,
    RefreshCw,
    Paperclip,
    Smile
} from 'lucide-react';
import styles from './page.module.css';
import { getMatrixClient } from '@/lib/matrix';
import { MatrixEvent, RoomEvent } from 'matrix-js-sdk';

interface Message {
    id: string;
    sender: string;
    content: string;
    timestamp: number;
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
    const [currentUserId, setCurrentUserId] = useState<string>('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const aiBackendUrl = process.env.NEXT_PUBLIC_AI_BACKEND_URL || '/api';

    useEffect(() => {
        const userId = localStorage.getItem('matrix_user_id');
        if (userId) setCurrentUserId(userId);

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
            const client = await getMatrixClient();
            if (client) {
                const room = client.getRoom(roomId);

                if (room) {
                    setRoomInfo({
                        id: roomId,
                        name: room.name,
                        topic: room.currentState.getStateEvents('m.room.topic', '')?.getContent().topic,
                        member_count: room.getJoinedMemberCount()
                    });

                    // Load initial messages
                    updateMessagesFromTimeline(room.getLiveTimeline().getEvents());

                    // Listen for new events
                    client.on(RoomEvent.Timeline, (event, room, toStartOfTimeline) => {
                        if (room?.roomId === roomId && !toStartOfTimeline && event.getType() === 'm.room.message') {
                            updateMessagesFromTimeline(room.getLiveTimeline().getEvents());
                        }
                    });
                } else {
                    // Try to join if not found (maybe invite invite)
                    try {
                        await client.joinRoom(roomId);
                        // Reload after join
                        setTimeout(loadRoomData, 1000);
                        return;
                    } catch (e) {
                        console.error("Could not find or join room", e);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load room data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateMessagesFromTimeline = (events: MatrixEvent[]) => {
        const formattedMessages: Message[] = events
            .filter(e => e.getType() === 'm.room.message')
            .map(e => ({
                id: e.getId()!,
                sender: e.getSender()!,
                content: e.getContent().body,
                timestamp: e.getTs(),
            }));
        setMessages(formattedMessages);
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
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const client = await getMatrixClient();
            if (client) {
                await client.sendTextMessage(roomId, newMessage);
                setNewMessage('');
                // Optimistic update handled by event listener usually, but can look laggier if waiting for server roundtrip
                // We'll rely on the listener for consistency
            }
        } catch (error) {
            console.error('Failed to send', error);
        }
    };

    const formatTime = (timestamp: number) => {
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
                        onClick={() => router.push('/rooms')}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className={styles.roomInfo}>
                        <h1>{roomInfo?.name || 'Room'}</h1>
                        <p>{roomInfo?.member_count || 0} members • {roomInfo?.topic || ''}</p>
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
                                className={`${styles.message} ${message.sender === currentUserId ? styles.sent : styles.received
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
