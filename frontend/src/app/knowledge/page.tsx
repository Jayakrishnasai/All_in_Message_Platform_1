'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    BookOpen,
    Search,
    RefreshCw,
    MessageCircle,
    ThumbsUp,
    ThumbsDown,
    Plus
} from 'lucide-react';
import styles from './page.module.css';

interface KnowledgeEntry {
    id?: string;
    question: string;
    answer: string;
    source_room: string;
    confidence: number;
}

export default function KnowledgePage() {
    const router = useRouter();
    const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const aiBackendUrl = process.env.NEXT_PUBLIC_AI_BACKEND_URL || '/api';

    useEffect(() => {
        loadEntries();
    }, []);

    const loadEntries = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${aiBackendUrl}/knowledge?limit=50`);
            if (response.ok) {
                const data = await response.json();
                setEntries(data.entries);
            }
        } catch (error) {
            console.error('Failed to load knowledge base:', error);
            // Mock data
            setEntries([
                {
                    id: '1',
                    question: 'How do I track my order?',
                    answer: 'You can track your order by logging into your account and visiting the "Orders" section. Each order will have a tracking link once it ships. You can also check your email for shipping notifications.',
                    source_room: 'Instagram Support',
                    confidence: 0.92
                },
                {
                    id: '2',
                    question: 'What are your business hours?',
                    answer: 'Our customer support is available Monday through Friday, 9 AM to 6 PM EST. For urgent issues, you can reach out via our emergency support line available 24/7.',
                    source_room: 'Instagram Support',
                    confidence: 0.88
                },
                {
                    id: '3',
                    question: 'How do I request a refund?',
                    answer: 'To request a refund, go to your order history, select the order you want to return, and click "Request Refund". Make sure to do this within 30 days of purchase. Refunds are processed within 5-7 business days.',
                    source_room: 'Sales Inquiries',
                    confidence: 0.95
                },
                {
                    id: '4',
                    question: 'What payment methods do you accept?',
                    answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, Apple Pay, and Google Pay. For enterprise customers, we also offer invoice-based billing.',
                    source_room: 'Sales Inquiries',
                    confidence: 0.91
                },
                {
                    id: '5',
                    question: 'How do I reset my password?',
                    answer: 'Click on "Forgot Password" on the login page, enter your email address, and we\'ll send you a reset link. The link expires after 24 hours for security reasons.',
                    source_room: 'Instagram Support',
                    confidence: 0.89
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            loadEntries();
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(`${aiBackendUrl}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: searchQuery,
                    top_k: 10
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Map search results to entries
                const searchResults = data.results.map((r: any, idx: number) => ({
                    id: idx.toString(),
                    question: r.content,
                    answer: r.metadata?.answer || 'Answer not available',
                    source_room: r.metadata?.room_id || 'Unknown',
                    confidence: r.score
                }));
                setEntries(searchResults);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.9) return 'var(--accent-success)';
        if (confidence >= 0.7) return 'var(--accent-warning)';
        return 'var(--accent-danger)';
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
                        <h1><BookOpen size={24} /> Knowledge Base</h1>
                        <p>Q&A extracted from your conversations</p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button className="btn btn-primary">
                        <Plus size={18} />
                        Add Entry
                    </button>
                </div>
            </header>

            {/* Search */}
            <div className={styles.searchSection}>
                <form onSubmit={handleSearch} className={styles.searchForm}>
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Search knowledge base..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                    <button type="submit" className="btn btn-secondary" disabled={isSearching}>
                        {isSearching ? 'Searching...' : 'Search'}
                    </button>
                </form>
            </div>

            {/* Entries */}
            <div className={styles.content}>
                {isLoading ? (
                    <div className={styles.loading}>
                        <div className="spinner" />
                        <span>Loading knowledge base...</span>
                    </div>
                ) : entries.length === 0 ? (
                    <div className={styles.empty}>
                        <BookOpen size={48} />
                        <p>No entries found</p>
                        <span>Start conversations to build your knowledge base</span>
                    </div>
                ) : (
                    <div className={styles.entriesGrid}>
                        {entries.map((entry, index) => (
                            <article key={entry.id || index} className={styles.entryCard}>
                                <div className={styles.entryHeader}>
                                    <span
                                        className={styles.confidence}
                                        style={{ background: getConfidenceColor(entry.confidence) }}
                                    >
                                        {Math.round(entry.confidence * 100)}%
                                    </span>
                                    <span className={styles.source}>{entry.source_room}</span>
                                </div>

                                <div className={styles.question}>
                                    <MessageCircle size={16} />
                                    <h3>{entry.question}</h3>
                                </div>

                                <p className={styles.answer}>{entry.answer}</p>

                                <div className={styles.entryFooter}>
                                    <button className={styles.feedbackBtn}>
                                        <ThumbsUp size={14} />
                                    </button>
                                    <button className={styles.feedbackBtn}>
                                        <ThumbsDown size={14} />
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
