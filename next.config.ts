
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/LightAudio',
  assetPrefix: '/LightAudio/',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
   webpack: (config, { isServer }) => {
    // This is to support our music scanner web worker
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'fs/promises': false,
        'path': false,
      };
    }
    return config;
  },
};

export default nextConfig;
