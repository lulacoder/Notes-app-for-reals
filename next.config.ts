import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_OFFLINE_BUILD: process.env.VERCEL_GIT_COMMIT_SHA ?? Date.now().toString(36) },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
