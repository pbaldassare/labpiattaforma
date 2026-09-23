import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Il pacchetto condiviso viene distribuito come sorgente TypeScript,
  // quindi deve passare dal compilatore di Next.
  transpilePackages: ["@lab/shared"],
};

export default nextConfig;
