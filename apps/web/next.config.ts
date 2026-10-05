import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['127.0.0.1'],
  async rewrites() {
    const backendUrl = process.env.INTERNAL_API_URL || "http://127.0.0.1:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/sanctum/:path*",
        destination: `${backendUrl}/sanctum/:path*`,
      },
      {
        source: "/storage/:path*",
        destination: `${backendUrl}/storage/:path*`,
      },
      {
        source: "/docs",
        destination: `${backendUrl}/docs`,
      },
      {
        source: "/docs/:path*",
        destination: `${backendUrl}/docs/:path*`,
      },
    ];
  },
};

export default nextConfig;
