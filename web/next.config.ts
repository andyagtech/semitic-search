import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the pre-generated search cache under data/cache/*.json is bundled
  // into the /api/search serverless function — Next.js's static tracing can't
  // see these files because they're loaded via a dynamic path at runtime.
  outputFileTracingIncludes: {
    "/api/search": ["./data/cache/**/*.json"],
  },
};

export default nextConfig;
