import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: '*.ufs.sh',
        protocol: 'https',
      },
    ],
  },
};

export default nextConfig;
