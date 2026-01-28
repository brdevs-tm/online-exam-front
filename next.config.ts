import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ngrok domainni shu yerga qo‘sh
  allowedDevOrigins: [
    "https://audrianna-overbrave-presumingly.ngrok-free.dev",
    "http://audrianna-overbrave-presumingly.ngrok-free.dev",
  ],

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8000/api/:path*",
      },
      {
        source: "/ws/:path*",
        destination: "http://127.0.0.1:8000/ws/:path*",
      },
    ];
  },
};

export default nextConfig;
