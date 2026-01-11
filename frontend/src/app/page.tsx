'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    MessageSquare,
    Brain,
    Shield,
    Zap,
    ArrowRight,
    Github,
    Sparkles
} from 'lucide-react';
import styles from './page.module.css';

export default function HomePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [homeserver, setHomeserver] = useState(
        process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL || 'https://dailyfix-matrix.duckdns.org'
    );
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Matrix login
            const response = await fetch(`${homeserver}/_matrix/client/r0/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'm.login.password',
                    user: username,
                    password: password,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Login failed');
            }

            const data = await response.json();

            // Store credentials
            localStorage.setItem('matrix_access_token', data.access_token);
            localStorage.setItem('matrix_user_id', data.user_id);
            localStorage.setItem('matrix_homeserver', homeserver);

            // Redirect to dashboard
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const features = [
        {
            icon: MessageSquare,
            title: 'Unified Messaging',
            description: 'Aggregate messages from Instagram and other platforms into one central hub.',
        },
        {
            icon: Brain,
            title: 'AI-Powered Insights',
            description: 'Get smart summaries, intent classification, and priority scoring.',
        },
        {
            icon: Zap,
            title: 'Real-time Sync',
            description: 'Messages sync instantly from social platforms via Matrix bridges.',
        },
        {
            icon: Shield,
            title: 'Secure & Private',
            description: 'End-to-end encryption support with Matrix protocol security.',
        },
    ];

    return (
        <div className={styles.container}>
            {/* Hero Section */}
            <header className={styles.header}>
                <div className={styles.logo}>
                    <Sparkles className={styles.logoIcon} />
                    <span>MIP</span>
                </div>
                <nav className={styles.nav}>
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                        <Github size={20} />
                    </a>
                </nav>
            </header>

            <main className={styles.main}>
                <div className={styles.heroContent}>
                    <div className={styles.heroText}>
                        <h1 className={styles.title}>
                            <span className={styles.gradient}>Messaging Intelligence</span>
                            <br />
                            Platform
                        </h1>
                        <p className={styles.subtitle}>
                            A central messaging hub that pulls chats from social platforms into Matrix,
                            stores them, and runs AI analysis to provide actionable insights.
                        </p>

                        {/* Features Grid */}
                        <div className={styles.features}>
                            {features.map((feature, index) => (
                                <div key={index} className={styles.featureCard}>
                                    <feature.icon className={styles.featureIcon} />
                                    <h3>{feature.title}</h3>
                                    <p>{feature.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Login Form */}
                    <div className={styles.loginSection}>
                        <div className={styles.loginCard}>
                            <h2>Sign In</h2>
                            <p className={styles.loginSubtitle}>
                                Connect with your Matrix account
                            </p>

                            <form onSubmit={handleLogin} className={styles.form}>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="homeserver" className="label">
                                        Homeserver URL
                                    </label>
                                    <input
                                        id="homeserver"
                                        type="url"
                                        className="input"
                                        value={homeserver}
                                        onChange={(e) => setHomeserver(e.target.value)}
                                        placeholder="https://matrix.example.com"
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label htmlFor="username" className="label">
                                        Username
                                    </label>
                                    <input
                                        id="username"
                                        type="text"
                                        className="input"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="@user:server.com"
                                        required
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label htmlFor="password" className="label">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        className="input"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>

                                {error && (
                                    <div className={styles.error}>
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className={`btn btn-primary ${styles.loginButton}`}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <span className={styles.loading}>Signing in...</span>
                                    ) : (
                                        <>
                                            Sign In
                                            <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </form>

                            <div className={styles.divider}>
                                <span>or continue with</span>
                            </div>

                            <button
                                className="btn btn-secondary w-full"
                                onClick={() => router.push('/dashboard')}
                            >
                                Demo Mode (No Login)
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            <footer className={styles.footer}>
                <p>Messaging Intelligence Platform • Built with Matrix & AI</p>
            </footer>
        </div>
    );
}
