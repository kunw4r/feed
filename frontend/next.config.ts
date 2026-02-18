import type { NextConfig } from "next";

const isStatic = process.env.NEXT_PUBLIC_STATIC === "true";

const nextConfig: NextConfig = {
  ...(isStatic
    ? {
        output: "export",
        basePath: "/feed",
        images: { unoptimized: true },
      }
    : {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: "http://localhost:8000/api/:path*",
            },
          ];
        },
      }),
};

export default nextConfig;
