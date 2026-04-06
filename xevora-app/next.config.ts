import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard/settings',
        destination: '/settings',
        permanent: true,
      },
      {
        source: '/dashboard/settings/:path*',
        destination: '/settings/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
