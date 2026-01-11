'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    MessageSquare,
    Search,
    ChevronRight,
    ArrowLeft
} from 'lucide-react';
import styles from '../dashboard/page.module.css'; // Reusing dashboard styles for consistency

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

    const aiBackendUrl = process.env.NEXT_PUBLIC_AI_BACKEND_URL || '/api';

    useEffect(() => {
        loadRooms();
    }, []);

    const loadRooms = async () => {
        setIsLoading(true);
        try {
            const roomsResponse = await fetch(`${aiBackendUrl}/rooms`);
            if (roomsResponse.ok) {
                const roomsData = await roomsResponse.json();
                setRooms(roomsData.rooms || []);
            }
        } catch (error) {
            console.error('Failed to load rooms:', error);
            // Mock data fallback
            setRooms([
                { id: '!demo1:server', name: 'Instagram Bridge - Support', member_count: 3, unread_count: 5 },
                { id: '!demo2:server', name: 'Instagram Bridge - Sales', member_count: 2, unread_count: 2 },
                { id: '!demo3:server', name: 'General Chat', member_count: 10, unread_count: 0 },
            ]);
        } finally {
            setIsLoading(false);
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
            </main>
        </div>
    );
}
