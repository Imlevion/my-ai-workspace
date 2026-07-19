import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  allowedDevOrigins: [
    "*.run.app",
    "*.asia-southeast1.run.app",
    "localhost:3000"
  ]
};

export default nextConfig;
