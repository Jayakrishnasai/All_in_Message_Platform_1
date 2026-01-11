'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    MessageSquare,
    Search,
    ChevronRight,
    ArrowLeft,
    Plus,
    X,
    Lock,
    Globe
} from 'lucide-react';
import styles from '../dashboard/page.module.css';
import { getMatrixClient, createMatrixRoom } from '@/lib/matrix';
import { Room as MatrixRoom } from 'matrix-js-sdk';

interface Room {
    id: string;
    name: string;
    member_count: number;
    unread_count?: number;
}

export default function RoomsPage() {
    const router = useRouter();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Create Room Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomTopic, setNewRoomTopic] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadRooms();
    }, []);

    const loadRooms = async () => {
        setIsLoading(true);
        try {
            const client = await getMatrixClient();
            if (client) {
                const joinedRooms = client.getVisibleRooms();

                const formattedRooms: Room[] = joinedRooms.map((room: MatrixRoom) => ({
                    id: room.roomId,
                    name: room.name,
                    member_count: room.getJoinedMemberCount(),
                    unread_count: room.getUnreadNotificationCount('total')
                }));

                setRooms(formattedRooms);
            }
        } catch (error) {
            console.error('Failed to load rooms:', error);
            // Fallback to empty if client fails, or we could handle it better
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRoomName.trim()) return;

        setIsCreating(true);
        try {
            const roomId = await createMatrixRoom(newRoomName, newRoomTopic, isPublic);
            setIsCreateModalOpen(false);
            setNewRoomName('');
            setNewRoomTopic('');
            // Refresh list and navigate
            await loadRooms();
            router.push(`/rooms/${encodeURIComponent(roomId)}`);
        } catch (error) {
            console.error('Failed to create room:', error);
            alert('Failed to create room. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const filteredRooms = rooms.filter(room =>
        room.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.layout}>
            <main className={styles.main}>
                <header className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1>All Rooms</h1>
                            <p>Manage and view all your active conversations</p>
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        <button
                            className="btn btn-primary"
                            onClick={() => setIsCreateModalOpen(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Plus size={18} />
                            Create Room
                        </button>
                    </div>
                </header>

                <div className={styles.contentGrid}>
                    <section className={styles.section} style={{ gridColumn: '1 / -1' }}>
                        <div className={styles.sectionHeader}>
                            <div className={styles.searchBox} style={{ width: '100%', maxWidth: '400px' }}>
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder="Search rooms..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.roomsList}>
                            {isLoading ? (
                                <div className={styles.loading}>
                                    <div className="spinner" />
                                    <span>Loading rooms...</span>
                                </div>
                            ) : filteredRooms.length === 0 ? (
                                <div className={styles.empty}>
                                    <MessageSquare size={40} />
                                    <p>No rooms found</p>
                                </div>
                            ) : (
                                filteredRooms.map((room) => (
                                    <a
                                        key={room.id}
                                        href={`/rooms/${encodeURIComponent(room.id)}`}
                                        className={styles.roomCard}
                                    >
                                        <div className={styles.roomInfo}>
                                            <div className={styles.roomAvatar}>
                                                {room.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3>{room.name}</h3>
                                                <p>{room.member_count} members</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {room.unread_count ? (
                                                <span className={styles.unreadBadge}>{room.unread_count}</span>
                                            ) : null}
                                            <ChevronRight size={20} color="var(--text-muted)" />
                                        </div>
                                    </a>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                {/* Create Room Modal */}
                {isCreateModalOpen && (
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
                            maxWidth: '500px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h2>Create New Room</h2>
                                <button onClick={() => setIsCreateModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateRoom}>
                                <div className={styles.inputGroup}>
                                    <label className="label">Room Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newRoomName}
                                        onChange={(e) => setNewRoomName(e.target.value)}
                                        placeholder="e.g. Project Alpha"
                                        required
                                    />
                                </div>
                                <div className={styles.inputGroup} style={{ marginBottom: '1rem' }}>
                                    <label className="label">Topic (Optional)</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newRoomTopic}
                                        onChange={(e) => setNewRoomTopic(e.target.value)}
                                        placeholder="What is this room about?"
                                    />
                                </div>

                                <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsPublic(false)}
                                        className={`btn ${!isPublic ? 'btn-secondary' : 'btn-ghost'}`}
                                        style={{ flex: 1, border: !isPublic ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)' }}
                                    >
                                        <Lock size={16} /> Private
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsPublic(true)}
                                        className={`btn ${isPublic ? 'btn-secondary' : 'btn-ghost'}`}
                                        style={{ flex: 1, border: isPublic ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)' }}
                                    >
                                        <Globe size={16} /> Public
                                    </button>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        disabled={isCreating}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={isCreating}
                                    >
                                        {isCreating ? 'Creating...' : 'Create Room'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
