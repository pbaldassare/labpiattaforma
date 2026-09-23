import type { NextConfig } from "next";

// Le foto stanno nel bucket pubblico di Supabase: Next deve sapere che quel
// dominio e' autorizzato, altrimenti si rifiuta di ottimizzarne le immagini.
const supabase = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  // Il pacchetto condiviso viene distribuito come sorgente TypeScript,
  // quindi deve passare dal compilatore di Next.
  transpilePackages: ["@lab/shared"],
  images: {
    remotePatterns: supabase
      ? [
          {
            protocol: supabase.protocol.replace(":", "") as "https" | "http",
            hostname: supabase.hostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
