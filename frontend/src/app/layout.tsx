import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
    title: 'Messaging Intelligence Platform',
    description: 'AI-powered messaging hub with Matrix integration and social media bridges',
    keywords: ['messaging', 'matrix', 'ai', 'nlp', 'instagram', 'analytics'],
    authors: [{ name: 'MIP Team' }],
    viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <div id="app-root">{children}</div>
            </body>
        </html>
    );
}
