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
    Globe,
    Users,
    Hash
} from 'lucide-react';
import styles from '../dashboard/page.module.css';
import { getMatrixClient, createMatrixRoom, getPublicRooms, joinRoom } from '@/lib/matrix';
import { Room as MatrixRoom, NotificationCountType, IPublicRoomsChunkRoom } from 'matrix-js-sdk';

interface Room {
    id: string;
    name: string;
    member_count: number;
    unread_count?: number;
    is_joined?: boolean;
    topic?: string;
}

type Tab = 'my_rooms' | 'public_directory';

export default function RoomsPage() {
    const router = useRouter();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>('my_rooms');

    // Create Room Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomTopic, setNewRoomTopic] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (activeTab === 'my_rooms') {
            loadJoinedRooms();
        } else {
            loadPublicRooms();
        }
    }, [activeTab]);

    const loadJoinedRooms = async () => {
        setIsLoading(true);
        try {
            const client = await getMatrixClient();
            if (client) {
                const joinedRooms = client.getVisibleRooms();

                const formattedRooms: Room[] = joinedRooms.map((room: MatrixRoom) => ({
                    id: room.roomId,
                    name: room.name,
                    member_count: room.getJoinedMemberCount(),
                    unread_count: room.getUnreadNotificationCount(NotificationCountType.Total),
                    is_joined: true
                }));

                setRooms(formattedRooms);
            }
        } catch (error) {
            console.error('Failed to load rooms:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadPublicRooms = async () => {
        setIsLoading(true);
        try {
            const publicRoomsData = await getPublicRooms(searchQuery);

            const formattedRooms: Room[] = publicRoomsData.map((room: IPublicRoomsChunkRoom) => ({
                id: room.room_id,
                name: room.name || room.canonical_alias || room.room_id,
                member_count: room.num_joined_members,
                topic: room.topic,
                is_joined: false // We assume false, could check against joined list but simple is fine
            }));

            setRooms(formattedRooms);
        } catch (error) {
            console.error('Failed to load public rooms:', error);
            setRooms([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeTab === 'public_directory') {
            loadPublicRooms();
        }
    };

    const handleJoinRoom = async (roomId: string) => {
        try {
            await joinRoom(roomId);
            router.push(`/rooms/${encodeURIComponent(roomId)}`);
        } catch (error) {
            console.error('Failed to join room:', error);
            alert('Failed to join room. It might be private or you may not have permission.');
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
            if (activeTab === 'my_rooms') {
                await loadJoinedRooms();
            } else {
                router.push(`/rooms/${encodeURIComponent(roomId)}`);
            }
        } catch (error) {
            console.error('Failed to create room:', error);
            alert('Failed to create room. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    const displayRooms = activeTab === 'my_rooms'
        ? rooms.filter(room => room.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : rooms;

    return (
        <div className={styles.layout}>
            <main className={styles.main}>
                <header className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1>Rooms</h1>
                            <p>Manage conversations and discover new groups</p>
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

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                            <button
                                className={`btn btn-ghost ${activeTab === 'my_rooms' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('my_rooms')}
                                style={{
                                    borderBottom: activeTab === 'my_rooms' ? '2px solid var(--accent-primary)' : 'none',
                                    borderRadius: '0',
                                    paddingBottom: '0.75rem',
                                    color: activeTab === 'my_rooms' ? 'var(--text-primary)' : 'var(--text-muted)'
                                }}
                            >
                                <MessageSquare size={16} style={{ marginRight: '0.5rem' }} />
                                My Rooms
                            </button>
                            <button
                                className={`btn btn-ghost ${activeTab === 'public_directory' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('public_directory')}
                                style={{
                                    borderBottom: activeTab === 'public_directory' ? '2px solid var(--accent-primary)' : 'none',
                                    borderRadius: '0',
                                    paddingBottom: '0.75rem',
                                    color: activeTab === 'public_directory' ? 'var(--text-primary)' : 'var(--text-muted)'
                                }}
                            >
                                <Globe size={16} style={{ marginRight: '0.5rem' }} />
                                Public Directory
                            </button>
                        </div>

                        <div className={styles.sectionHeader}>
                            <form onSubmit={handleSearch} className={styles.searchBox} style={{ width: '100%', maxWidth: '400px' }}>
                                <Search size={18} />
                                <input
                                    type="text"
                                    placeholder={activeTab === 'public_directory' ? "Search for public rooms..." : "Filter my rooms..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </form>
                        </div>

                        <div className={styles.roomsList}>
                            {isLoading ? (
                                <div className={styles.loading}>
                                    <div className="spinner" />
                                    <span>Loading rooms...</span>
                                </div>
                            ) : displayRooms.length === 0 ? (
                                <div className={styles.empty}>
                                    <MessageSquare size={40} />
                                    <p>No rooms found</p>
                                </div>
                            ) : (
                                displayRooms.map((room) => (
                                    <div
                                        key={room.id}
                                        className={styles.roomCard}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            if (activeTab === 'my_rooms') router.push(`/rooms/${encodeURIComponent(room.id)}`);
                                        }}
                                    >
                                        <div className={styles.roomInfo}>
                                            <div className={styles.roomAvatar}>
                                                {room.name ? room.name.charAt(0).toUpperCase() : '#'}
                                            </div>
                                            <div>
                                                <h3>{room.name}</h3>
                                                <p>{room.member_count} members {room.topic && `• ${room.topic}`}</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {activeTab === 'my_rooms' && room.unread_count ? (
                                                <span className={styles.unreadBadge}>{room.unread_count}</span>
                                            ) : null}

                                            {activeTab === 'public_directory' && (
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleJoinRoom(room.id);
                                                    }}
                                                >
                                                    Join
                                                </button>
                                            )}

                                            {activeTab === 'my_rooms' && (
                                                <ChevronRight size={20} color="var(--text-muted)" />
                                            )}
                                        </div>
                                    </div>
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

                                {isPublic && (
                                    <div className="alert alert-info" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
                                        Public rooms will be listed in the directory and anyone can join.
                                    </div>
                                )}

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
