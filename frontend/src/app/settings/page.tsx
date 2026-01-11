'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Settings,
    User,
    Server,
    Shield,
    LogOut,
    ArrowLeft,
    Moon,
    Bell
} from 'lucide-react';
import styles from '../dashboard/page.module.css';

export default function SettingsPage() {
    const router = useRouter();
    const [homeserver, setHomeserver] = useState('');
    const [userId, setUserId] = useState('');

    useEffect(() => {
        setHomeserver(localStorage.getItem('matrix_homeserver') || '');
        setUserId(localStorage.getItem('matrix_user_id') || '');
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('matrix_access_token');
        localStorage.removeItem('matrix_user_id');
        localStorage.removeItem('matrix_homeserver');
        router.push('/');
    };

    return (
        <div className={styles.layout}>
            <main className={styles.main}>
                <header className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button onClick={() => router.back()} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1>Settings</h1>
                            <p>Manage your account and preferences</p>
                        </div>
                    </div>
                </header>

                <div className={styles.contentGrid}>
                    <section className={styles.section} style={{ gridColumn: '1 / -1' }}>
                        <div className={styles.sectionHeader}>
                            <h2><User size={20} /> Account Information</h2>
                        </div>
                        <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label className="label">User ID</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <User size={16} />
                                    <span>{userId || 'Not logged in'}</span>
                                </div>
                            </div>
                            <div>
                                <label className="label">Homeserver</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <Server size={16} />
                                    <span>{homeserver || 'Not connected'}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className={styles.section} style={{ gridColumn: '1 / -1' }}>
                        <div className={styles.sectionHeader}>
                            <h2><Settings size={20} /> Application Settings</h2>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className={styles.settingItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <Moon size={20} />
                                    <div>
                                        <h3>Dark Mode</h3>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Use dark theme across the application</p>
                                    </div>
                                </div>
                                <div style={{ color: 'var(--text-muted)' }}>Always On</div>
                            </div>

                            <div className={styles.settingItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <Bell size={20} />
                                    <div>
                                        <h3>Notifications</h3>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Enable desktop notifications</p>
                                    </div>
                                </div>
                                <button className="btn btn-secondary" disabled>Coming Soon</button>
                            </div>

                            <div className={styles.settingItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <Shield size={20} />
                                    <div>
                                        <h3>Encryption</h3>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>End-to-end encryption settings</p>
                                    </div>
                                </div>
                                <button className="btn btn-secondary" disabled>Managed by Matrix</button>
                            </div>
                        </div>
                    </section>

                    <section className={styles.section} style={{ gridColumn: '1 / -1' }}>
                        <div className={styles.sectionHeader}>
                            <h2>Session</h2>
                        </div>
                        <button onClick={handleLogout} className="btn btn-primary" style={{ background: 'var(--accent-danger)' }}>
                            <LogOut size={18} />
                            Sign Out
                        </button>
                    </section>
                </div>
            </main>
        </div>
    );
}
