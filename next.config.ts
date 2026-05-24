import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow dev access from the LAN IP and the cloudflared quick tunnel,
  // otherwise Next 16 blocks cross-origin dev requests (breaks HMR/hydration).
  allowedDevOrigins: ["192.168.0.19", "*.trycloudflare.com"],
  // better-sqlite3 is a native module — keep it out of the bundle so it's
  // require()'d at runtime by the collection backend route handlers.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
