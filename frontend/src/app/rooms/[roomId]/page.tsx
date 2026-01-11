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
    Smile,
    UserPlus,
    X
} from 'lucide-react';
import styles from './page.module.css';
import { getMatrixClient, inviteUser } from '@/lib/matrix';
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
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviteUserId, setInviteUserId] = useState('');

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

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await inviteUser(roomId, inviteUserId);
            setIsInviteModalOpen(false);
            setInviteUserId('');
            alert('Invitation sent!');
        } catch (error) {
            console.error('Failed to invite user:', error);
            alert('Failed to invite user. Please check the ID and try again.');
        }
    }

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
                        onClick={() => setIsInviteModalOpen(true)}
                    >
                        <UserPlus size={18} />
                        Invite
                    </button>
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

            {/* Invite Modal */}
            {isInviteModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)',
                        width: '90%',
                        maxWidth: '400px',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2>Invite User</h2>
                            <button onClick={() => setIsInviteModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleInviteUser}>
                            <div className={styles.inputGroup}>
                                <label className="label">User ID</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={inviteUserId}
                                    onChange={(e) => setInviteUserId(e.target.value)}
                                    placeholder="@user:server.com"
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={() => setIsInviteModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                >
                                    Send Invite
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
