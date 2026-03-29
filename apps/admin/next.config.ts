import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@8gent/shared", "@8gent/ui", "@8gent/db"],
};

export default nextConfig;
