/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    domains: ['matrix.org'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.duckdns.org',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_MATRIX_HOMESERVER_URL: process.env.NEXT_PUBLIC_MATRIX_HOMESERVER_URL,
    NEXT_PUBLIC_AI_BACKEND_URL: process.env.NEXT_PUBLIC_AI_BACKEND_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.AI_BACKEND_INTERNAL_URL || 'http://ai-service:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
