import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Django URLs end with "/". Without this, Next.js would 308-redirect
  // /api/auth/me/ to /api/auth/me before the /api proxy route sees it.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
