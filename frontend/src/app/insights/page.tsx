'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Brain,
    FileText,
    Calendar,
    TrendingUp,
    Users,
    MessageSquare,
    RefreshCw,
    Download
} from 'lucide-react';
import styles from './page.module.css';

interface DailyReport {
    date: string;
    total_messages: number;
    high_priority_count: number;
    room_summaries: {
        [key: string]: {
            message_count: number;
            summary: string;
            participants: string[];
        };
    };
    top_intents: {
        [key: string]: {
            count: number;
            percentage: number;
        };
    };
}

export default function InsightsPage() {
    const router = useRouter();
    const [report, setReport] = useState<DailyReport | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const aiBackendUrl = process.env.NEXT_PUBLIC_AI_BACKEND_URL || '/api';

    useEffect(() => {
        loadReport();
    }, [selectedDate]);

    const loadReport = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${aiBackendUrl}/reports/daily?date=${selectedDate}`);
            if (response.ok) {
                const data = await response.json();
                setReport(data);
            }
        } catch (error) {
            console.error('Failed to load report:', error);
            // Mock data
            setReport({
                date: selectedDate,
                total_messages: 156,
                high_priority_count: 12,
                room_summaries: {
                    'Instagram Support': {
                        message_count: 89,
                        summary: 'Customers primarily reached out about order tracking, account access issues, and product inquiries. Several urgent support requests were addressed regarding delivery delays and payment failures.',
                        participants: ['user_123', 'user_456', 'user_789', 'admin']
                    },
                    'Sales Inquiries': {
                        message_count: 45,
                        summary: 'Multiple leads showed interest in premium plans and enterprise features. Key topics included pricing comparisons, feature demonstrations, and custom integration requests.',
                        participants: ['lead_1', 'lead_2', 'sales_rep']
                    },
                    'General': {
                        message_count: 22,
                        summary: 'Casual conversations and team coordination. Some feature suggestions were discussed.',
                        participants: ['team_member_1', 'team_member_2']
                    }
                },
                top_intents: {
                    support: { count: 65, percentage: 41.7 },
                    casual: { count: 45, percentage: 28.8 },
                    sales: { count: 34, percentage: 21.8 },
                    urgent: { count: 12, percentage: 7.7 }
                }
            });
        } finally {
            setIsLoading(false);
        }
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
                        <h1><Brain size={24} /> AI Insights</h1>
                        <p>Automated analysis and summaries of your conversations</p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className={styles.datePicker}
                    />
                    <button className="btn btn-secondary" onClick={loadReport}>
                        <RefreshCw size={18} />
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className={styles.loading}>
                    <div className="spinner" />
                    <span>Generating insights...</span>
                </div>
            ) : report ? (
                <div className={styles.content}>
                    {/* Overview Cards */}
                    <div className={styles.overviewGrid}>
                        <div className={styles.overviewCard}>
                            <Calendar size={24} />
                            <div>
                                <span className={styles.overviewValue}>{report.date}</span>
                                <span className={styles.overviewLabel}>Report Date</span>
                            </div>
                        </div>
                        <div className={styles.overviewCard}>
                            <MessageSquare size={24} />
                            <div>
                                <span className={styles.overviewValue}>{report.total_messages}</span>
                                <span className={styles.overviewLabel}>Total Messages</span>
                            </div>
                        </div>
                        <div className={styles.overviewCard}>
                            <TrendingUp size={24} />
                            <div>
                                <span className={styles.overviewValue}>{report.high_priority_count}</span>
                                <span className={styles.overviewLabel}>High Priority</span>
                            </div>
                        </div>
                        <div className={styles.overviewCard}>
                            <Users size={24} />
                            <div>
                                <span className={styles.overviewValue}>
                                    {Object.keys(report.room_summaries).length}
                                </span>
                                <span className={styles.overviewLabel}>Active Rooms</span>
                            </div>
                        </div>
                    </div>

                    {/* Intent Distribution */}
                    <section className={styles.section}>
                        <h2>Intent Distribution</h2>
                        <div className={styles.intentGrid}>
                            {Object.entries(report.top_intents).map(([intent, data]) => (
                                <div key={intent} className={styles.intentCard}>
                                    <div className={styles.intentHeader}>
                                        <span className={`badge intent-${intent}`}>{intent}</span>
                                        <span className={styles.intentPercent}>{data.percentage}%</span>
                                    </div>
                                    <div className={styles.intentBar}>
                                        <div
                                            className={styles.intentFill}
                                            style={{
                                                width: `${data.percentage}%`,
                                                background: intent === 'urgent' ? 'var(--accent-danger)' :
                                                    intent === 'support' ? 'var(--accent-secondary)' :
                                                        intent === 'sales' ? 'var(--accent-success)' :
                                                            'var(--text-muted)'
                                            }}
                                        />
                                    </div>
                                    <span className={styles.intentCount}>{data.count} messages</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Room Summaries */}
                    <section className={styles.section}>
                        <h2>Room Summaries</h2>
                        <div className={styles.summaryGrid}>
                            {Object.entries(report.room_summaries).map(([roomName, data]) => (
                                <div key={roomName} className={styles.summaryCard}>
                                    <div className={styles.summaryHeader}>
                                        <h3>{roomName}</h3>
                                        <span className={styles.messageCount}>
                                            {data.message_count} messages
                                        </span>
                                    </div>
                                    <p className={styles.summaryText}>{data.summary}</p>
                                    <div className={styles.participants}>
                                        <Users size={14} />
                                        <span>{data.participants.length} participants</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Export */}
                    <div className={styles.exportSection}>
                        <button className="btn btn-primary">
                            <Download size={18} />
                            Export Report
                        </button>
                    </div>
                </div>
            ) : (
                <div className={styles.empty}>
                    <FileText size={48} />
                    <p>No report available for this date</p>
                </div>
            )}
        </div>
    );
}
