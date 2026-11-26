import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_OFFLINE_BUILD: process.env.VERCEL_GIT_COMMIT_SHA ?? Date.now().toString(36) },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: { root: process.cwd() },
  async headers() {
    return [
      {
        // Browsers must always see the latest worker so a new build replaces the cached offline editor.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
