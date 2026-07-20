import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.run.app",
    "*.asia-southeast1.run.app",
    "localhost:3000"
  ]
};

export default nextConfig;
