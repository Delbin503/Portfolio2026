import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray lockfile in the home dir otherwise
  // makes Next infer the wrong root. process.cwd() is the project dir at
  // build time and is safe whether the config compiles as CJS or ESM.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
