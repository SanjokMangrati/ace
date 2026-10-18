import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",
  logging: {
    serverFunctions: false,
  },
}

export default nextConfig
