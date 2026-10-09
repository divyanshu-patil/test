const apiOrigin = process.env.API_ORIGIN ?? "http://localhost:8000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // Browser talks to same-origin /api/v1; Next forwards to FastAPI so session cookies stay first-party.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiOrigin}/api/v1/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  experimental: { proxyClientMaxBodySize: "110mb" },
};

export default nextConfig;
