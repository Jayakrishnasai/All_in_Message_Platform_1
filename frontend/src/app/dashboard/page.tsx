'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    MessageSquare,
    Brain,
    TrendingUp,
    AlertCircle,
    Users,
    Clock,
    ChevronRight,
    RefreshCw,
    Search,
    LogOut,
    Menu,
    X,
    Sparkles,
    BarChart3,
    Inbox,
    BookOpen,
    Settings
} from 'lucide-react';
import styles from './page.module.css';

interface Room {
    id: string;
    name: string;
    member_count: number;
    topic?: string;
    last_message?: string;
    unread_count?: number;
}

interface DailyStats {
    total_messages: number;
    rooms_active: number;
    high_priority: number;
    intents: {
        urgent: number;
        support: number;
        sales: number;
        casual: number;
    };
}

export default function DashboardPage() {
    const router = useRouter();
    const [rooms, setRooms] = useState<Room[]>([]);
    const [stats, setStats] = useState<DailyStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const aiBackendUrl = process.env.NEXT_PUBLIC_AI_BACKEND_URL || '/api';

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setIsLoading(true);
        try {
            // Load rooms
            const roomsResponse = await fetch(`${aiBackendUrl}/rooms`);
            if (roomsResponse.ok) {
                const roomsData = await roomsResponse.json();
                setRooms(roomsData.rooms || []);
            }

            // Load daily report
            const reportResponse = await fetch(`${aiBackendUrl}/reports/daily`);
            if (reportResponse.ok) {
                const reportData = await reportResponse.json();
                setStats({
                    total_messages: reportData.total_messages,
                    rooms_active: Object.keys(reportData.room_summaries).length,
                    high_priority: reportData.high_priority_count,
                    intents: {
                        urgent: reportData.top_intents?.urgent?.count || 0,
                        support: reportData.top_intents?.support?.count || 0,
                        sales: reportData.top_intents?.sales?.count || 0,
                        casual: reportData.top_intents?.casual?.count || 0,
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            // Set mock data for demo
            setRooms([
                { id: '!demo1:server', name: 'Instagram Bridge - Support', member_count: 3, unread_count: 5 },
                { id: '!demo2:server', name: 'Instagram Bridge - Sales', member_count: 2, unread_count: 2 },
                { id: '!demo3:server', name: 'General Chat', member_count: 10, unread_count: 0 },
            ]);
            setStats({
                total_messages: 156,
                rooms_active: 3,
                high_priority: 12,
                intents: { urgent: 8, support: 45, sales: 23, casual: 80 }
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('matrix_access_token');
        localStorage.removeItem('matrix_user_id');
        localStorage.removeItem('matrix_homeserver');
        router.push('/');
    };

    const filteredRooms = rooms.filter(room =>
        room.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const navItems = [
        { icon: BarChart3, label: 'Dashboard', href: '/dashboard', active: true },
        { icon: MessageSquare, label: 'Messages', href: '/rooms' },
        { icon: Inbox, label: 'Priority Inbox', href: '/priority' },
        { icon: Brain, label: 'AI Insights', href: '/insights' },
        { icon: BookOpen, label: 'Knowledge Base', href: '/knowledge' },
        { icon: Settings, label: 'Settings', href: '/settings' },
    ];

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>
                        <Sparkles className={styles.logoIcon} />
                        {sidebarOpen && <span>MIP</span>}
                    </div>
                    <button
                        className={styles.toggleBtn}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item, index) => (
                        <a
                            key={index}
                            href={item.href}
                            className={`${styles.navItem} ${item.active ? styles.active : ''}`}
                        >
                            <item.icon size={20} />
                            {sidebarOpen && <span>{item.label}</span>}
                        </a>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <button className={styles.logoutBtn} onClick={handleLogout}>
                        <LogOut size={20} />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                {/* Header */}
                <header className={styles.header}>
                    <div>
                        <h1>Dashboard</h1>
                        <p>Welcome back! Here's your messaging overview.</p>
                    </div>
                    <div className={styles.headerActions}>
                        <div className={styles.searchBox}>
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search rooms..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-secondary" onClick={loadDashboardData}>
                            <RefreshCw size={18} />
                            Refresh
                        </button>
                    </div>
                </header>

                {/* Stats Grid */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.2)' }}>
                            <MessageSquare size={24} color="var(--accent-primary)" />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stats?.total_messages || 0}</span>
                            <span className={styles.statLabel}>Total Messages</span>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: 'rgba(6, 182, 212, 0.2)' }}>
                            <Users size={24} color="var(--accent-secondary)" />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stats?.rooms_active || 0}</span>
                            <span className={styles.statLabel}>Active Rooms</span>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                            <AlertCircle size={24} color="var(--accent-danger)" />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>{stats?.high_priority || 0}</span>
                            <span className={styles.statLabel}>High Priority</span>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                            <TrendingUp size={24} color="var(--accent-success)" />
                        </div>
                        <div className={styles.statInfo}>
                            <span className={styles.statValue}>
                                {stats ? stats.intents.support + stats.intents.sales : 0}
                            </span>
                            <span className={styles.statLabel}>Actionable</span>
                        </div>
                    </div>
                </div>

                <div className={styles.contentGrid}>
                    {/* Rooms List */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2><MessageSquare size={20} /> Rooms</h2>
                            <a href="/rooms" className={styles.viewAll}>
                                View All <ChevronRight size={16} />
                            </a>
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
                                        {room.unread_count ? (
                                            <span className={styles.unreadBadge}>{room.unread_count}</span>
                                        ) : null}
                                    </a>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Intent Distribution */}
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2><Brain size={20} /> Intent Distribution</h2>
                        </div>
                        <div className={styles.intentChart}>
                            {stats && (
                                <>
                                    <div className={styles.intentBar}>
                                        <div className={styles.intentLabel}>
                                            <span className={`badge intent-urgent`}>Urgent</span>
                                            <span>{stats.intents.urgent}</span>
                                        </div>
                                        <div className={styles.barContainer}>
                                            <div
                                                className={styles.barFill}
                                                style={{
                                                    width: `${(stats.intents.urgent / stats.total_messages) * 100 || 0}%`,
                                                    background: 'var(--accent-danger)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.intentBar}>
                                        <div className={styles.intentLabel}>
                                            <span className={`badge intent-support`}>Support</span>
                                            <span>{stats.intents.support}</span>
                                        </div>
                                        <div className={styles.barContainer}>
                                            <div
                                                className={styles.barFill}
                                                style={{
                                                    width: `${(stats.intents.support / stats.total_messages) * 100 || 0}%`,
                                                    background: 'var(--accent-secondary)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.intentBar}>
                                        <div className={styles.intentLabel}>
                                            <span className={`badge intent-sales`}>Sales</span>
                                            <span>{stats.intents.sales}</span>
                                        </div>
                                        <div className={styles.barContainer}>
                                            <div
                                                className={styles.barFill}
                                                style={{
                                                    width: `${(stats.intents.sales / stats.total_messages) * 100 || 0}%`,
                                                    background: 'var(--accent-success)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles.intentBar}>
                                        <div className={styles.intentLabel}>
                                            <span className={`badge intent-casual`}>Casual</span>
                                            <span>{stats.intents.casual}</span>
                                        </div>
                                        <div className={styles.barContainer}>
                                            <div
                                                className={styles.barFill}
                                                style={{
                                                    width: `${(stats.intents.casual / stats.total_messages) * 100 || 0}%`,
                                                    background: 'var(--text-muted)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </section>
                </div>

                {/* Quick Actions */}
                <section className={styles.quickActions}>
                    <h2>Quick Actions</h2>
                    <div className={styles.actionCards}>
                        <a href="/priority" className={styles.actionCard}>
                            <Inbox size={24} />
                            <h3>Priority Inbox</h3>
                            <p>View messages that need immediate attention</p>
                        </a>
                        <a href="/insights" className={styles.actionCard}>
                            <Brain size={24} />
                            <h3>AI Insights</h3>
                            <p>Get summaries and analysis of conversations</p>
                        </a>
                        <a href="/knowledge" className={styles.actionCard}>
                            <BookOpen size={24} />
                            <h3>Knowledge Base</h3>
                            <p>Search extracted Q&A from conversations</p>
                        </a>
                    </div>
                </section>
            </main>
        </div>
    );
}
