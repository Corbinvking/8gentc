import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@8gent/shared", "@8gent/ui", "@8gent/db", "@8gent/api-client"],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://*.clerk.accounts.dev",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' blob: data: https://*.clerk.com https://*.gravatar.com https://img.clerk.com",
              "font-src 'self'",
              "connect-src 'self' https://*.clerk.accounts.dev https://api.stripe.com https://*.posthog.com wss://*.clerk.accounts.dev",
              "frame-src 'self' https://js.stripe.com https://*.clerk.accounts.dev",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
